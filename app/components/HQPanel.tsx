"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { Player } from "@/lib/types";
import { Card as UICard } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import type { SigilRuntimeState } from "@/store/gameStore";
import { Flame, Sparkles } from "lucide-react";

interface HQPanelProps {
  player: Player;
  isEnemy?: boolean;
  sigil?: SigilRuntimeState;
  turn?: number;
}

const StatPill = ({
  label,
  value,
  alignRight = false,
}: {
  label: string;
  value: string | number;
  alignRight?: boolean;
}) => (
  <div
    className={cn(
      "flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.3em] text-white/60",
      alignRight && "flex-row-reverse"
    )}
  >
    <span>{label}</span>
    <span className="text-white font-semibold tracking-normal">{value}</span>
  </div>
);

const SIGIL_THRESHOLD = {
  overload: 3,
  override: 2,
};

const SigilChip = ({ sigil }: { sigil?: SigilRuntimeState }) => {
  if (!sigil) return null;
  const threshold = SIGIL_THRESHOLD[sigil.type];
  const progress = Math.min(100, (sigil.stacks / threshold) * 100);
  const label = sigil.type === "overload" ? "Overload" : "Override";
  const icon =
    sigil.type === "overload" ? (
      <Flame className="h-[14px] w-[14px] text-orange-400" />
    ) : (
      <Sparkles className="h-[14px] w-[14px] text-sky-300" />
    );

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70">
      {icon}
      <div className="flex flex-col gap-1">
        <span className="text-white font-semibold tracking-[0.15em]">{label}</span>
        <div className="w-20 h-1 rounded-full bg-white/20 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              sigil.type === "overload"
                ? "bg-gradient-to-r from-orange-400 to-red-500"
                : "bg-gradient-to-r from-sky-400 to-violet-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <span className="font-semibold text-white">
        {sigil.stacks}/{threshold}
      </span>
    </div>
  );
};

export function HQPanel({ player, isEnemy = false, sigil }: HQPanelProps) {
  const [isDamaged, setIsDamaged] = useState(false);
  const [previousHp, setPreviousHp] = useState(player.hp);
  const [damageAmount, setDamageAmount] = useState<number | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [hpBarFlash, setHpBarFlash] = useState<"red" | "green" | null>(null);

  // Detect damage/healing
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const hpChange = player.hp - previousHp;
    
    if (hpChange < 0) {
      // Damage taken
      setIsDamaged(true);
      setIsShaking(true);
      setDamageAmount(hpChange);
      setHpBarFlash("red");
      
      setTimeout(() => {
        setIsDamaged(false);
        setIsShaking(false);
        setHpBarFlash(null);
      }, 600);
      
      setTimeout(() => {
        setDamageAmount(null);
      }, 1200);
    } else if (hpChange > 0) {
      // Healing
      setDamageAmount(hpChange);
      setHpBarFlash("green");
      
      setTimeout(() => {
        setHpBarFlash(null);
      }, 600);
      
      setTimeout(() => {
        setDamageAmount(null);
      }, 1200);
    }
    
    setPreviousHp(player.hp);
  }, [player.hp, previousHp]);

  const hpPercentage = (player.hp / player.maxHp) * 100;
  const roleColor = player.role === "attacker" ? "text-red-400" : "text-yellow-400";
  const manaPercentage = (player.mana / Math.max(1, player.maxMana)) * 100;

  return (
    <UICard
      className={cn(
        "w-full p-4 bg-linear-to-br from-slate-900/95 to-slate-800/95 border relative overflow-hidden",
        "backdrop-blur-md transition-all duration-300 rounded-2xl",
        isDamaged && "border-red-500 shadow-red-500/50 shadow-xl",
        isShaking && "animate-hq-shake"
      )}
    >
      {/* Hit Ripple Effect */}
      {isDamaged && (
        <div
          className={cn(
            "absolute inset-0 rounded-lg pointer-events-none",
            "bg-red-500/30 animate-hq-hit-ripple"
          )}
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "100px",
            height: "100px",
            borderRadius: "50%",
          }}
        />
      )}

      {/* Damage/Healing Number Pop-up */}
      {damageAmount !== null && (
        <div
          className={cn(
            "absolute pointer-events-none font-bold text-4xl z-50 animate-damage-popup",
            damageAmount < 0 ? "text-red-400" : "text-green-400",
            isEnemy ? "right-1/2 top-1/4" : "left-1/2 top-1/4"
          )}
          style={{
            textShadow:
              damageAmount < 0
                ? "0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.5)"
                : "0 0 20px rgba(34, 197, 94, 0.8), 0 0 40px rgba(34, 197, 94, 0.5)",
          }}
        >
          {damageAmount > 0 ? "+" : ""}
          {damageAmount}
        </div>
      )}
      <div className={cn("flex flex-col gap-3", isEnemy && "items-end")}>
        {/* Header row */}
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 w-full",
            isEnemy && "flex-row-reverse"
          )}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span className={cn("text-base font-bold uppercase", roleColor)}>
              {player.role}
            </span>
            <span
              className={cn(
                "flex h-2.5 w-2.5 rounded-full",
                player.role === "attacker" ? "bg-red-500" : "bg-yellow-400"
              )}
            ></span>
            {sigil && <SigilChip sigil={sigil} />}
          </div>

          <div
            className={cn(
              "flex flex-wrap items-center gap-2 text-xs text-white/70",
              isEnemy && "flex-row-reverse text-right"
            )}
          >
            <StatPill label="Deck" value={player.deck.length} alignRight={isEnemy} />
            <StatPill label="Hand" value={`${player.hand.length}/7`} alignRight={isEnemy} />
            <StatPill label="Discard" value={player.discardPile.length} alignRight={isEnemy} />
          </div>
        </div>

        {/* HP & Mana */}
        <div className="grid w-full gap-3 md:grid-cols-[1fr_auto]">
          <div className={cn("flex flex-col gap-2", isEnemy && "items-end")}>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{player.hp}</span>
              <span className="text-base text-white/60">/ {player.maxHp}</span>
            </div>
            <div className="w-full h-4 bg-slate-800/50 rounded-full overflow-hidden border border-slate-700 relative">
              <div
                className={cn(
                  "h-full transition-all duration-500 ease-out relative",
                  hpPercentage > 60 &&
                    "bg-gradient-to-r from-green-500 to-green-400",
                  hpPercentage > 30 &&
                    hpPercentage <= 60 &&
                    "bg-gradient-to-r from-yellow-500 to-yellow-400",
                  hpPercentage <= 30 &&
                    "bg-gradient-to-r from-red-500 to-red-400",
                  hpBarFlash === "red" &&
                    "bg-gradient-to-r from-red-600 to-red-500 animate-pulse",
                  hpBarFlash === "green" &&
                    "bg-gradient-to-r from-green-600 to-green-500 animate-pulse"
                )}
                style={{ width: `${hpPercentage}%` }}
              >
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 w-36">
            <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.3em] text-white/70">
              <span className={cn("text-white/70", isEnemy && "order-2")}>mana</span>
              <span
                className={cn(
                  "text-white font-semibold tracking-normal",
                  isEnemy && "order-1"
                )}
              >
                {player.mana} / {player.maxMana}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800/70 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-linear-to-r from-cyan-400 to-emerald-400 transition-all duration-500 relative"
                style={{ width: `${manaPercentage}%` }}
              >
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </UICard>
  );
}

/* eslint-enable react-hooks/set-state-in-effect */

