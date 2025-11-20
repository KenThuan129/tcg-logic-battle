"use client";

import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Activity,
  BugPlay,
  ChevronLeft,
  ChevronRight,
  History,
} from "lucide-react";

type DebugConsoleSidebarProps = {
  log: string[];
  className?: string;
  defaultOpen?: boolean;
  floating?: boolean;
};

type LogEntry = {
  id: number;
  label: string | null;
  message: string;
  variant: "player" | "enemy" | "system";
};

export function DebugConsoleSidebar({
  log,
  className,
  defaultOpen = false,
  floating = false,
}: DebugConsoleSidebarProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const timeline = useMemo<LogEntry[]>(() => {
    return log.map((entry, idx) => {
      const separatorIndex = entry.indexOf(":");
      const label =
        separatorIndex > -1 ? entry.slice(0, separatorIndex).trim() : null;
      const message =
        separatorIndex > -1 ? entry.slice(separatorIndex + 1).trim() : entry;

      const normalized = entry.toLowerCase();
      const variant: LogEntry["variant"] = normalized.includes("player")
        ? "player"
        : normalized.includes("enemy")
        ? "enemy"
        : "system";

      return {
        id: idx + 1,
        label,
        message,
        variant,
      };
    });
  }, [log]);

  return (
    <aside
      className={cn(
        "relative h-full text-slate-100 transition-[width] duration-300 ease-in-out border-white/5 border-l",
        floating
          ? "rounded-3xl border bg-slate-950/90 shadow-[0_15px_45px_rgba(2,6,23,0.8)] backdrop-blur-lg"
          : "bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 shadow-[0_0_60px_rgba(15,23,42,0.7)]",
        isOpen ? "w-[24rem]" : "w-12",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "absolute left-0 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-800 bg-slate-950/90 p-2 text-slate-200 shadow-xl shadow-slate-950/60 transition hover:bg-slate-900",
          isOpen ? "h-10 w-10" : "h-12 w-12"
        )}
        aria-label={isOpen ? "Collapse debug console" : "Expand debug console"}
      >
        {isOpen ? (
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        ) : (
          <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
        )}
      </button>

      <div
        className={cn(
          "flex h-full w-full min-h-0 flex-col overflow-hidden transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-70"
        )}
      >
        {isOpen ? (
          <>
            <header className="flex items-start justify-between border-b border-white/5 px-6 pb-4 pt-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500/20 to-blue-500/20 text-emerald-300 shadow-inner shadow-emerald-400/30">
                  <BugPlay className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-white/70">
                    Debug Console
                  </p>
                  <p className="text-xs text-white/50">Turn-by-turn log</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/50">
                <span className="flex items-center gap-1 rounded-full border border-emerald-400/40 px-2 py-1 text-emerald-300">
                  <Activity className="h-3 w-3" />
                  Live
                </span>
                <span className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-white/70">
                  <History className="h-3 w-3" />
                  {timeline.length}
                </span>
              </div>
            </header>

            <ScrollArea className="flex-1 h-full px-6 py-5">
              <div className="relative h-full">
                <span className="pointer-events-none absolute left-[27px] top-2 bottom-2 w-px bg-linear-to-b from-transparent via-slate-700 to-transparent" />
                <ol className="relative h-full space-y-4 font-mono text-xs">
                {timeline.length === 0 && (
                  <li className="relative rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-white/50">
                    Waiting for the first turn…
                  </li>
                )}
                {timeline.map((entry, index) => (
                  <li key={entry.id} className="relative pl-10">
                    <span className="absolute left-1 top-2 flex h-4 w-4 items-center justify-center rounded-full border border-white/70 bg-slate-950 shadow-[0_0_15px_rgba(15,23,42,0.45)]">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          entry.variant === "player" && "bg-sky-400",
                          entry.variant === "enemy" && "bg-rose-400",
                          entry.variant === "system" && "bg-amber-300"
                        )}
                      />
                    </span>

                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-white/50">
                      <span>Step {index + 1}</span>
                      <span>#{entry.id.toString().padStart(3, "0")}</span>
                    </div>
                    <div className="mt-1 rounded-2xl border border-white/5 bg-white/5 p-3 shadow-inner shadow-black/20 transition hover:border-white/10 hover:bg-white/10">
                      {entry.label && (
                        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">
                          {entry.label}
                        </p>
                      )}
                      <p className="mt-1 text-sm leading-relaxed text-white/80">
                        {entry.message}
                      </p>
                    </div>
                  </li>
                ))}
                </ol>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.6em] text-white/60 [writing-mode:vertical-rl]"
            >
              Log
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}


