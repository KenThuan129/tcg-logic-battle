"use client";

import type { StoreApi } from "zustand";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { gameStoreApi, type GameStore } from "@/store/gameStore";
import { HQPanel } from "./HQPanel";
import { Hand } from "./Hand";
import { TurnIndicator } from "./TurnIndicator";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useRef } from "react";
import { DebugConsoleSidebar } from "./DebugConsoleSidebar";

type GameBoardProps = {
  store?: StoreApi<GameStore>;
  autoBoot?: boolean;
  showLog?: boolean;
};

export function GameBoard({ store, autoBoot = true, showLog = false }: GameBoardProps) {
  const boundStore = useMemo(() => store ?? gameStoreApi, [store]);
  const { player, enemy, log, reset, sigils, turn } = useStore(
    boundStore,
    useShallow((state) => ({
      player: state.player,
      enemy: state.enemy,
      log: state.log,
      reset: state.reset,
      sigils: state.sigils,
      turn: state.turn,
    }))
  );
  const hasInitialized = useRef(false);

  // Initialize game on mount (only once)
  useEffect(() => {
    if (!hasInitialized.current && autoBoot) {
      hasInitialized.current = true;
      reset();
    }
  }, [autoBoot, reset]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 relative">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(147,51,234,0.1),transparent_50%)]" />

      {/* Main Game Layout */}
      <div className="relative w-full h-full flex flex-col p-4 gap-3">
        {/* Top: Enemy HQ */}
        <div className="space-y-1">
          <div className="h-28">
            <HQPanel player={enemy} sigil={sigils.enemy} isEnemy />
          </div>
          <div className="w-full h-36 absolute top-35 left-1/2 -translate-x-1/2">
            <Hand
              cards={enemy.hand}
              playerId="enemy"
              isEnemy
              store={boundStore}
              concealCards
              className="scale-65 origin-top opacity-80 pointer-events-none"
            />
          </div>
        </div>

        {/* Middle: Game Info */}
        <div className="flex-1 grid grid-cols-[200px_1fr_200px] items-center gap-3 min-h-0">
          {/* Left: Turn Indicator */}
          <div className="flex flex-col items-center gap-4 ">
            <TurnIndicator store={boundStore} />
            <Button
              onClick={() => {
                reset();
              }}
              className="w-full bg-blue-600 hover:bg-blue-700"
              type="button"
            >
              Reset Game
            </Button>
          </div>

          {/* Center: Battle Field (can be used for future animations) */}
          <div className="flex items-center justify-center h-full">
            <div className="text-6xl opacity-20">⚔️</div>
          </div>

          <div className="absolute bottom-35 left-1/2 -translate-x-1/2 w-full">
            <Hand
              cards={player.hand}
              playerId="player"
              store={boundStore}
              className="scale-85 origin-bottom opacity-80"
            />
          </div>
        </div>

        {/* Bottom: Player HQ */}
        <div className="h-28 mb-4">
          <HQPanel player={player} sigil={sigils.player} />
        </div>
      </div>

      {showLog && (
        <div className="hidden xl:flex absolute right-6 top-28 z-30 h-[calc(100%-220px)] pointer-events-none">
          <DebugConsoleSidebar
            log={log}
            floating
            defaultOpen={false}
            className="pointer-events-auto"
          />
        </div>
      )}
    </div>
  );
}

