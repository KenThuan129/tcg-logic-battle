"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ModeSelectorProps = {
  onSelect: (mode: "pve" | "pvp") => void;
};

const options = [
  {
    mode: "pve" as const,
    title: "PvE Skirmish",
    description: "Fight against the adaptive AI commander. Perfect for testing decks and practicing combos.",
    accent: "from-emerald-500/20 to-emerald-500/5",
    badge: "Solo",
  },
  {
    mode: "pvp" as const,
    title: "PvP Colosseum",
    description: "Host or join live matches. Battle a friend locally or connect via Supabase lobbies.",
    accent: "from-purple-500/20 to-purple-500/5",
    badge: "Online",
  },
];

export function ModeSelector({ onSelect }: ModeSelectorProps) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-950/80 to-slate-900 flex flex-col items-center justify-center px-4 py-12 text-white">
      <div className="text-center space-y-3 mb-10">
        <p className="text-sm uppercase tracking-[0.4em] text-white/50">Select Operation</p>
        <h1 className="text-4xl font-bold">IT Colloseum Online</h1>
        <p className="text-white/70 max-w-2xl">
          Authenticate with Supabase to unlock persistent profiles, PvE test runs, and the brand-new PvP lobby system.
        </p>
      </div>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
        {options.map((option) => (
          <Card
            key={option.mode}
            className={cn(
              "bg-slate-900/70 border-slate-800 hover:border-white/20 transition group relative overflow-hidden",
              "before:absolute before:inset-0 before:bg-gradient-to-br",
              option.accent,
              "before:opacity-0 before:transition before:duration-300 group-hover:before:opacity-100"
            )}
          >
            <CardHeader className="relative">
              <CardTitle className="flex items-center justify-between">
                {option.title}
                <span className="text-xs px-2 py-0.5 rounded-full border border-white/20 uppercase tracking-[0.3em]">
                  {option.badge}
                </span>
              </CardTitle>
              <CardDescription className="text-white/70">{option.description}</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <Button className="w-full" variant="secondary" onClick={() => onSelect(option.mode)}>
                Enter {option.mode === "pve" ? "PvE" : "PvP"} Mode
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
