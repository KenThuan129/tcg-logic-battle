"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerId } from "@/lib/types";
import type { MatchRow, MatchStatus } from "@/lib/supabase/types";
import { createGameStore, type GameSnapshot, type GameStore } from "@/store/gameStore";
import type { StoreApi } from "zustand";
import { useSupabase } from "./useSupabase";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { toast } from "sonner";

const cloneSnapshot = (snapshot: GameSnapshot): GameSnapshot => {
  if (typeof structuredClone === "function") {
    return structuredClone(snapshot);
  }
  return JSON.parse(JSON.stringify(snapshot));
};

const mirrorSnapshot = (snapshot: GameSnapshot): GameSnapshot => {
  const source = cloneSnapshot(snapshot);
  return {
    turn: source.turn,
    currentPlayer: source.currentPlayer === "player" ? "enemy" : "player",
    suddenDeath: source.suddenDeath,
    gameOver: source.gameOver,
    winner:
      source.winner === "player" ? "enemy" : source.winner === "enemy" ? "player" : source.winner,
    player: source.enemy,
    enemy: source.player,
    log: source.log,
    nextAttackBuff: {
      player: source.nextAttackBuff.enemy,
      enemy: source.nextAttackBuff.player,
    },
    nextAttackReduction: {
      player: source.nextAttackReduction.enemy,
      enemy: source.nextAttackReduction.player,
    },
    damageOverTime: {
      player: source.damageOverTime.enemy,
      enemy: source.damageOverTime.player,
    },
    reflectShield: {
      player: source.reflectShield.enemy,
      enemy: source.reflectShield.player,
    },
    debuffImmunity: {
      player: source.debuffImmunity.enemy,
      enemy: source.debuffImmunity.player,
    },
    mode: source.mode,
    surpriseEvent: source.surpriseEvent,
    surpriseEventTriggered: source.surpriseEventTriggered,
    handLimitActive: source.handLimitActive,
  };
};

type UseOnlineMatchArgs = {
  matchId: string;
  slot: PlayerId;
};

type UseOnlineMatchResult = {
  store: StoreApi<GameStore>;
  match: MatchRow | null;
  loading: boolean;
  error: string | null;
  isHost: boolean;
  syncState: () => Promise<void>;
  resetMatch: () => Promise<void>;
  leaveMatch: () => Promise<void>;
};

export const useOnlineMatch = ({ matchId, slot }: UseOnlineMatchArgs): UseOnlineMatchResult => {
  const supabase = useSupabase();
  const { session } = useSessionContext();
  const [store] = useState<StoreApi<GameStore>>(() => {
    const api = createGameStore();
    api.getState().reset({ mode: "pvp" });
    return api;
  });
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isHost = match?.host_id === session?.user.id;
  const hydrateLockRef = useRef(false);
  const readyRef = useRef(false);
  const syncTimer = useRef<NodeJS.Timeout | null>(null);

  const toLocalPerspective = useCallback(
    (snapshot: GameSnapshot) => (slot === "enemy" ? mirrorSnapshot(snapshot) : snapshot),
    [slot]
  );

  const toHostPerspective = useCallback(
    (snapshot: GameSnapshot) => (slot === "enemy" ? mirrorSnapshot(snapshot) : snapshot),
    [slot]
  );

  const statusFromSnapshot = useCallback(
    (snapshot: GameSnapshot): MatchStatus => {
      if (snapshot.gameOver) {
        return "finished";
      }
      if (match?.guest_id) {
        return "active";
      }
      return "waiting";
    },
    [match?.guest_id]
  );

  const syncState = useCallback(async () => {
    const snapshot = store.getState().snapshot();
    const hostSnapshot = toHostPerspective(snapshot);
    const status = statusFromSnapshot(hostSnapshot);

    const { error } = await supabase
      .from("matches")
      .update({
        state: hostSnapshot,
        status,
        last_action_at: new Date().toISOString(),
      })
      .eq("id", matchId);

    if (error) {
      toast.error("Failed to sync match state", { description: error.message });
      throw error;
    }

    setMatch((prev) => (prev ? { ...prev, state: hostSnapshot, status } : prev));
  }, [matchId, statusFromSnapshot, store, supabase, toHostPerspective]);

  const scheduleSync = useCallback(() => {
    if (!readyRef.current || hydrateLockRef.current) {
      return;
    }
    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
    }
    syncTimer.current = setTimeout(() => {
      syncTimer.current = null;
      void syncState().catch(() => {
        /* handled in syncState */
      });
    }, 200);
  }, [syncState]);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      scheduleSync();
    });
    return () => {
      unsubscribe();
      if (syncTimer.current) {
        clearTimeout(syncTimer.current);
      }
    };
  }, [scheduleSync, store]);

  const applySnapshot = useCallback(
    (snapshot: GameSnapshot) => {
      hydrateLockRef.current = true;
      store.getState().hydrate(snapshot);
      hydrateLockRef.current = false;
    },
    [store]
  );

  const refreshMatch = useCallback(async () => {
    const { data, error } = await supabase
      .from("matches")
      .select(
        `
        *,
        host:profiles!matches_host_id_fkey(id, username),
        guest:profiles!matches_guest_id_fkey(id, username)
      `
      )
      .eq("id", matchId)
      .single();

    if (error) {
      setError(error.message);
      return null;
    }

    const typed = data as MatchRow;
    setMatch(typed);

    if (typed.state) {
      applySnapshot(toLocalPerspective(typed.state as GameSnapshot));
    }

    return typed;
  }, [applySnapshot, matchId, supabase, toLocalPerspective]);

  useEffect(() => {
    readyRef.current = false;
    setLoading(true);
    void refreshMatch().finally(() => {
      readyRef.current = true;
      setLoading(false);
    });
  }, [refreshMatch]);

  useEffect(() => {
    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        () => {
          void refreshMatch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, refreshMatch, supabase]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!readyRef.current || hydrateLockRef.current) {
        return;
      }
      void refreshMatch();
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [refreshMatch]);

  const resetMatch = useCallback(async () => {
    store.getState().reset({ mode: "pvp" });
    await syncState();
  }, [store, syncState]);

  const leaveMatch = useCallback(async () => {
    if (!session) return;

    if (slot === "player") {
      await supabase.from("matches").delete().eq("id", matchId);
    } else {
      await supabase
        .from("matches")
        .update({
          guest_id: null,
          status: "waiting",
        })
        .eq("id", matchId);
    }
  }, [matchId, session, slot, supabase]);

  return {
    store,
    match,
    loading,
    error,
    isHost,
    syncState,
    resetMatch,
    leaveMatch,
  };
};

/* eslint-enable react-hooks/set-state-in-effect */

