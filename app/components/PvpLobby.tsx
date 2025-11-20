"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { toast } from "sonner";
import { Loader2, PlusCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSupabase } from "@/hooks/useSupabase";
import type { MatchRow } from "@/lib/supabase/types";
import { createGameStore } from "@/store/gameStore";
import { ActiveMatch } from "./GameShell";

type PvpLobbyProps = {
  onBack: () => void;
  onEnterMatch: (match: ActiveMatch) => void;
};

type LobbyEntry = MatchRow & {
  host?: { id: string; username: string | null };
  guest?: { id: string; username: string | null };
};

export function PvpLobby({ onBack, onEnterMatch }: PvpLobbyProps) {
  const { session } = useSessionContext();
  const supabase = useSupabase();
  const [rooms, setRooms] = useState<LobbyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const username = useMemo(
    () => session?.user.user_metadata?.username ?? session?.user.email?.split("@")[0] ?? "Commander",
    [session?.user.user_metadata?.username, session?.user.email]
  );

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("matches")
      .select(
        `
        *,
        host:profiles!matches_host_id_fkey(id, username),
        guest:profiles!matches_guest_id_fkey(id, username)
      `
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast.error("Unable to load rooms", { description: error.message });
    } else {
      setRooms((data ?? []) as LobbyEntry[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    const channel = supabase
      .channel("public:matches")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => {
          void fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRooms, supabase]);

  const handleCreateRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) {
      toast.error("You must be signed in to host a room.");
      return;
    }

    setCreating(true);
    try {
      const snapshotStore = createGameStore();
      snapshotStore.getState().reset({ mode: "pvp" });
      const snapshot = snapshotStore.getState().snapshot();

      const { data, error } = await supabase
        .from("matches")
        .insert({
          title: roomName || `${username}'s Room`,
          status: "waiting",
          is_public: isPublic,
          host_id: session.user.id,
          state: snapshot,
        })
        .select()
        .single();

      if (error) {
        toast.error("Unable to create room", { description: error.message });
      } else if (data) {
        setRoomName("");
        onEnterMatch({ matchId: data.id, slot: "player" });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async (room: LobbyEntry) => {
    if (!session) {
      toast.error("You must be signed in to join a room.");
      return;
    }
    if (room.guest_id && room.guest_id !== session.user.id) {
      toast.error("Room already has two commanders.");
      return;
    }

    setJoiningId(room.id);
    try {
      const { data, error } = await supabase
        .from("matches")
        .update({
          guest_id: session.user.id,
          status: "active",
        })
        .eq("id", room.id)
        .is("guest_id", null)
        .select()
        .single();

      if (error || !data) {
        toast.error("Unable to join room", { description: error?.details ?? error?.message ?? "Room unavailable" });
      } else {
        onEnterMatch({ matchId: data.id, slot: room.host_id === session.user.id ? "player" : "enemy" });
      }
    } finally {
      setJoiningId(null);
    }
  };

  const renderActionButton = (room: LobbyEntry) => {
    const isHost = room.host_id === session?.user.id;
    const isGuest = room.guest_id === session?.user.id;
    const inProgress = room.status !== "waiting" && !!room.guest_id;

    if (isHost) {
      return (
        <Button
          variant="secondary"
          onClick={() => onEnterMatch({ matchId: room.id, slot: "player" })}
        >
          Re-enter
        </Button>
      );
    }

    if (isGuest) {
      return (
        <Button
          variant="secondary"
          onClick={() => onEnterMatch({ matchId: room.id, slot: "enemy" })}
        >
          Resume
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        disabled={joiningId === room.id || inProgress || !room.is_public}
        onClick={() => handleJoinRoom(room)}
      >
        {joiningId === room.id ? <Loader2 className="h-4 w-4 animate-spin" /> : inProgress ? "Full" : "Join"}
      </Button>
    );
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-950/80 to-slate-900 text-white">
      <div className="flex items-center justify-between p-6">
        <Button variant="ghost" className="text-white/70" onClick={onBack}>
          ← Back
        </Button>
        <div className="text-right text-white/70 text-sm">
          Signed in as <span className="text-white font-semibold">{username}</span>
          <div className="text-xs text-white/50">Supabase synced profile</div>
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col gap-6 px-6 pb-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card className="bg-slate-900/60 border-white/10 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-500/20 text-emerald-300 p-3">
                  <PlusCircle className="h-5 w-5" />
                </div>
                Host a Battle Room
              </CardTitle>
              <CardDescription>Spin up a fresh lobby for PvP duels. Rooms can be private or visible in the public listing.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleCreateRoom}>
                <div>
                  <label className="text-xs uppercase tracking-[0.4em] text-white/50">Room name</label>
                  <Input
                    value={roomName}
                    onChange={(event) => setRoomName(event.target.value)}
                    placeholder="e.g. Tactical Ops, Code Warriors"
                    className="mt-2 bg-slate-950/50 border-slate-800 text-white"
                  />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">Public Listing</p>
                    <p className="text-xs text-white/60">Allow other commanders to discover this room.</p>
                  </div>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                </div>
                <Button type="submit" disabled={creating} className="w-full">
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Deploying room…
                    </>
                  ) : (
                    "Create Room"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-white/10 backdrop-blur-lg flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="rounded-2xl bg-sky-500/20 text-sky-300 p-3">
                  <Users className="h-5 w-5" />
                </div>
                Active Rooms
              </CardTitle>
              <CardDescription>Find open matches or rejoin ones you’re already part of.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-white/60">
                  <Loader2 className="h-5 w-5 animate-spin mr-3" />
                  Loading rooms from Supabase…
                </div>
              ) : rooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-white/60">
                  <p className="text-lg font-semibold">No rooms yet</p>
                  <p className="text-sm text-white/50">Host the very first PvP battle of the day.</p>
                </div>
              ) : (
                <ScrollArea className="h-[420px] pr-4">
                  <div className="flex flex-col gap-3">
                    {rooms.map((room) => (
                      <div key={room.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-white">{room.title ?? "Untitled room"}</p>
                            <p className="text-xs text-white/60">Host: {room.host?.username ?? room.host_id.slice(0, 6)}</p>
                          </div>
                          <Badge variant="outline" className="text-xs uppercase tracking-[0.3em]">
                            {room.is_public ? "Public" : "Private"}
                          </Badge>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm text-white/70">
                          <div>
                            <span>{room.status.toUpperCase()}</span>{" "}
                            <span className="text-white/40 mx-1">•</span>
                            <span>
                              {room.guest_id ? "2 / 2 players" : "1 / 2 players"}
                            </span>
                          </div>
                          {renderActionButton(room)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

