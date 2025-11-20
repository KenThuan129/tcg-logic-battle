"use client";

import { useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, LogOut, RefreshCcw } from "lucide-react";
import { GameBoard } from "./GameBoard";
import type { ActiveMatch } from "./GameShell";
import { useOnlineMatch } from "@/hooks/useOnlineMatch";
import { toast } from "sonner";

type OnlineMatchProps = {
  activeMatch: ActiveMatch;
  onExit: () => void;
};

export function OnlineMatch({ activeMatch, onExit }: OnlineMatchProps) {
  const { store, match, loading, error, isHost, resetMatch, leaveMatch, syncState } = useOnlineMatch(activeMatch);

  const handleLeave = useCallback(async () => {
    await leaveMatch();
    onExit();
  }, [leaveMatch, onExit]);

  const handleResync = useCallback(async () => {
    try {
      await syncState();
      toast.success("State synchronized");
    } catch {
      /* error already surfaced */
    }
  }, [syncState]);

  const title = useMemo(() => match?.title ?? `Match ${match?.id.slice(0, 6) ?? ""}`, [match?.id, match?.title]);
  const hostName = match?.host?.username ?? match?.host_id?.slice(0, 6) ?? "Host";
  const guestName = match?.guest?.username ?? match?.guest_id?.slice(0, 6) ?? "Awaiting";

  if (loading || !match) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        <p>Syncing match state…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
        <p className="text-red-400 font-semibold">Unable to load match</p>
        <p className="text-white/70">{error}</p>
        <Button onClick={onExit}>Return to Lobby</Button>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen">
      <div className="absolute z-30 top-4 left-4 flex flex-col gap-3">
        <Card className="bg-slate-900/80 border-white/10 text-white px-4 py-3 min-w-[260px]">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{title}</span>
            <Badge variant="outline" className="uppercase tracking-[0.3em] text-xs">
              {match.status}
            </Badge>
          </div>
          <div className="mt-2 text-xs text-white/70">
            <div>Host: {hostName}</div>
            <div>Guest: {guestName}</div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="secondary" className="uppercase tracking-[0.3em] text-[10px]">
              You: {activeMatch.slot.toUpperCase()}
            </Badge>
            {isHost && <Badge variant="outline">Host</Badge>}
          </div>
        </Card>
        <div className="flex gap-2">
          <Button variant="secondary" className="bg-emerald-600 hover:bg-emerald-500" onClick={resetMatch}>
            Reset Match
          </Button>
          <Button variant="outline" onClick={handleResync}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Sync
          </Button>
        </div>
      </div>

      <div className="absolute z-30 top-4 right-4 flex gap-2">
        <Button variant="destructive" onClick={handleLeave}>
          <LogOut className="h-4 w-4 mr-2" />
          Leave Room
        </Button>
      </div>

      <GameBoard store={store} autoBoot={false} showLog />
    </div>
  );
}

