"use client";

import { Card as CardType } from "@/lib/types";
import { Card as UICard } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CardProps {
  card: CardType;
  onClick?: () => void;
  disabled?: boolean;
  isEnemy?: boolean;
  isDiscarding?: boolean;
  isHovered?: boolean;
  onHover?: (hovered: boolean) => void;
  unaffordable?: boolean;
  hidden?: boolean;
}

export function Card({ 
  card, 
  onClick, 
  disabled = false, 
  isEnemy = false,
  isDiscarding = false,
  isHovered = false,
  onHover,
  unaffordable = false,
  hidden = false,
}: CardProps) {
  const colorClasses = {
    red: "border-red-500 bg-gradient-to-br from-red-950/90 to-red-900/80 shadow-red-500/50",
    yellow: "border-yellow-500 bg-gradient-to-br from-yellow-950/90 to-yellow-900/80 shadow-yellow-500/50",
    green: "border-green-500 bg-gradient-to-br from-green-950/90 to-green-900/80 shadow-green-500/50",
  };

  const glowClasses = {
    red: "hover:shadow-red-500/75 hover:shadow-2xl",
    yellow: "hover:shadow-yellow-500/75 hover:shadow-2xl",
    green: "hover:shadow-green-500/75 hover:shadow-2xl",
  };

  const symbol = {
    red: "⚔️",
    yellow: "🛡️",
    green: "✨",
  };

  const effectLabel =
    card.color === "red"
      ? card.meta?.attack?.flavor ?? "burst"
      : card.color === "yellow"
      ? card.meta?.defense
        ? Object.keys(card.meta.defense)[0] ?? "shield"
        : "shield"
      : "boost";

  const effectTags: string[] = [];
  if (card.color === "red" && card.meta?.attack) {
    const { flavor, lifestealPct, dot, bypassShield } = card.meta.attack;
    if (flavor) effectTags.push(`${flavor.replace("-", " ")} damage`);
    if (lifestealPct) effectTags.push(`${Math.round(lifestealPct * 100)}% omnivamp`);
    if (dot) effectTags.push(`DoT ${dot.damage} x ${dot.duration}`);
    if (bypassShield) effectTags.push("Bypasses shields");
  }
  if (card.color === "yellow" && card.meta?.defense) {
    const def = card.meta.defense;
    if (def.block) effectTags.push(`Block ${def.block}`);
    if (def.deflect) effectTags.push(`Deflect ${def.deflect}`);
    if (def.heal) effectTags.push(`Heal ${def.heal}`);
    if (def.cleanse) effectTags.push("Cleanse");
    if (def.debuffImmunity) effectTags.push("Debuff immune");
  }
  if (card.color === "green" && card.meta?.utility) {
    const util = card.meta.utility;
    if (util.attackBuff) effectTags.push(`+${util.attackBuff} attack`);
    if (util.defenseBuff) effectTags.push(`+${util.defenseBuff} defense`);
    if (util.enemyWeaken) effectTags.push(`-${util.enemyWeaken} enemy atk`);
    if (util.heal) effectTags.push(`Heal ${util.heal}`);
    if (util.draw) effectTags.push(`Draw ${util.draw}`);
  }

  if (hidden) {
    return (
      <UICard
        className={cn(
          "relative w-28 h-44 border-2 border-slate-600 bg-linear-to-br from-slate-900 to-slate-800 text-white/60 flex items-center justify-center rounded-xl shadow-inner shadow-black/40",
          isEnemy && "opacity-70"
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-lg">🂠</span>
          <p className="text-[10px] uppercase tracking-[0.4em]">Encrypted</p>
        </div>
      </UICard>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <UICard
            className={cn(
              "relative w-32 h-48 cursor-pointer transition-all duration-300 border-2",
              "backdrop-blur-sm bg-gradient-to-br",
              "transform hover:scale-110 hover:-translate-y-4",
              colorClasses[card.color],
              !disabled && !isEnemy && !isDiscarding && glowClasses[card.color],
              (disabled || unaffordable) && "opacity-50 cursor-not-allowed",
              isEnemy && "opacity-40 cursor-default",
              isDiscarding && "animate-card-discard z-50",
              isHovered && "scale-110 -translate-y-4 z-50 shadow-2xl"
            )}
            onClick={disabled || unaffordable || isEnemy || isDiscarding ? undefined : onClick}
            onMouseEnter={() => onHover?.(true)}
            onMouseLeave={() => onHover?.(false)}
          >
            <div className="p-3 h-full flex flex-col justify-between text-white">
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <span className="text-2xl">{symbol[card.color]}</span>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold bg-black/30 px-2 py-0.5 rounded">
                    {card.value > 0 ? card.value : "—"}
                  </span>
                  <span className="text-[10px] font-semibold bg-cyan-500/30 border border-cyan-400/40 px-2 py-0.5 rounded-full">
                    {card.manaCost ?? 0} MP
                  </span>
                </div>
              </div>

              {/* Card Name */}
              <div className="text-center mt-2">
                <h3 className="font-bold text-sm leading-tight">{card.name}</h3>
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 mt-1">
                  {typeof effectLabel === "string" ? effectLabel : "protocol"}
                </p>
              </div>

              {/* Card Type Badge */}
              <div className="text-center mt-2">
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  card.type === "primary" ? "bg-blue-500/30" : "bg-purple-500/30"
                )}>
                  {card.type}
                </span>
              </div>

              {/* Glass reflection effect */}
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-t-lg pointer-events-none" />

              {unaffordable && (
                <div className="absolute inset-0 bg-slate-950/80 rounded-lg flex items-center justify-center text-[10px] font-semibold uppercase tracking-[0.4em]">
                  Need Mana
                </div>
              )}
            </div>
          </UICard>
        </TooltipTrigger>
        <TooltipContent className="w-64 text-white bg-slate-900/95 border-slate-700 shadow-xl">
          <p className="text-sm font-semibold">{card.name}</p>
          <p className="text-xs text-white/70 mt-1">{card.description}</p>
          {effectTags.length > 0 && (
            <ul className="mt-2 text-xs text-white/80 space-y-1">
              {effectTags.map((tag) => (
                <li key={tag} className="flex items-center gap-2 before:content-['•'] before:text-cyan-300">
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

