"use client";

import type { StoreApi } from "zustand";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { gameStoreApi, type GameStore } from "@/store/gameStore";
import { Card as UICard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TurnIndicatorProps = {
  store?: StoreApi<GameStore>;
};

export function TurnIndicator({ store }: TurnIndicatorProps) {
  const boundStore = store ?? gameStoreApi;
  const { turn, currentPlayer, suddenDeath, gameOver, winner } = useStore(
    boundStore,
    useShallow((state) => ({
      turn: state.turn,
      currentPlayer: state.currentPlayer,
      suddenDeath: state.suddenDeath,
      gameOver: state.gameOver,
      winner: state.winner,
    }))
  );

  return (
    <UICard className="p-4 bg-gradient-to-br from-slate-800/95 to-slate-900/95 border-2 border-slate-700 backdrop-blur-md">
      <div className="flex flex-col items-center gap-3">
        {/* Turn Number */}
        <div className="text-center">
          <div className="text-xs text-white/60 mb-1">TURN</div>
          <div className="text-2xl font-bold text-white">{turn}</div>
        </div>

        {/* Current Player */}
        <div className={cn(
          "px-4 py-2 rounded-lg font-bold text-sm transition-all",
          currentPlayer === "player"
            ? "bg-blue-500/30 text-blue-300 border border-blue-500/50"
            : "bg-red-500/30 text-red-300 border border-red-500/50"
        )}>
          {currentPlayer === "player" ? "YOUR TURN" : "ENEMY TURN"}
        </div>

        {/* Sudden Death Badge */}
        {suddenDeath && (
          <Badge className="bg-orange-500/30 text-orange-300 border-orange-500/50 animate-pulse">
            ⚡ SUDDEN DEATH
          </Badge>
        )}

        {/* Game Over */}
        {gameOver && (
          <Badge className={cn(
            "font-bold text-lg px-4 py-2",
            winner === "player" && "bg-green-500/30 text-green-300 border-green-500/50",
            winner === "enemy" && "bg-red-500/30 text-red-300 border-red-500/50",
            !winner && "bg-gray-500/30 text-gray-300 border-gray-500/50"
          )}>
            {winner === "player" && "🎉 VICTORY!"}
            {winner === "enemy" && "💀 DEFEAT!"}
            {!winner && "🤝 DRAW"}
          </Badge>
        )}
      </div>
    </UICard>
  );
}

