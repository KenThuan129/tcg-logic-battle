"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DeckManager } from "./DeckManager";
import { useLocalDecks } from "@/hooks/useLocalDecks";
import { cardsFromIds, DEFAULT_DECK_IDS } from "@/lib/cards/pool";
import { createGameStore } from "@/store/gameStore";
import type { ArmorPool, GameStore } from "@/store/gameStore";
import type { SigilType } from "@/lib/types";
import { StoreApi } from "zustand";
import { GameBoard } from "./GameBoard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type View = "menu" | "deck" | "play";

const heroCopy = {
  title: "IT Colloseum – Offline Ops",
  description:
    "PvP and Supabase services are offline. Build decks locally and battle our adaptive AI to keep your skills sharp.",
};

type DifficultyConfig = {
  id: string;
  name: string;
  description: string;
  enemyDeckSize: number;
  enemySigil: SigilType;
  enemyHpBonus: number;
  enemyArmor?: ArmorPool;
  enemyExtraDraw?: number;
  enemyGuaranteedAttackCards?: number;
};

const DIFFICULTIES: DifficultyConfig[] = [
  {
    id: "easy",
    name: "Easy",
    description: "Standard duel. Both sides run 30-card decks and Overload sigils.",
    enemyDeckSize: 30,
    enemySigil: "overload",
    enemyHpBonus: 0,
  },
  {
    id: "medium",
    name: "Medium",
    description: "Enemy draws an extra card and starts with +10 HP.",
    enemyDeckSize: 30,
    enemySigil: "overload",
    enemyHpBonus: 10,
    enemyExtraDraw: 1,
  },
  {
    id: "hard",
    name: "Hard",
    description: "Override sigil, +20 HP, and 3 armor stacks that soak 1 damage.",
    enemyDeckSize: 30,
    enemySigil: "override",
    enemyHpBonus: 20,
    enemyArmor: { stacks: 3, reduction: 1 },
  },
  {
    id: "very-hard",
    name: "Very Hard",
    description: "50-card deck, +25 HP, armor stacks start at 5.",
    enemyDeckSize: 50,
    enemySigil: "override",
    enemyHpBonus: 25,
    enemyArmor: { stacks: 5, reduction: 1 },
  },
  {
    id: "nightmare",
    name: "Nightmare",
    description: "50-card deck, +20 HP, heavy armor (-5 dmg) and attack-heavy openers.",
    enemyDeckSize: 50,
    enemySigil: "override",
    enemyHpBonus: 20,
    enemyArmor: { stacks: 10, reduction: 5 },
    enemyGuaranteedAttackCards: 2,
  },
];

const shuffleCards = <T,>(cards: T[]): T[] => {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export function OfflineShell() {
  const { hydrated, decks, activeDeckId, setActiveDeck, createDeck, updateDeck, deleteDeck } = useLocalDecks();
  const activeDeck = useMemo(() => decks.find((deck) => deck.id === activeDeckId), [activeDeckId, decks]);
  const [view, setView] = useState<View>("menu");
  const [difficultyId, setDifficultyId] = useState<string>(DIFFICULTIES[0].id);
  const storeRef = useRef<StoreApi<GameStore>>(createGameStore());
  const selectedDifficulty = useMemo(
    () => DIFFICULTIES.find((config) => config.id === difficultyId) ?? DIFFICULTIES[0],
    [difficultyId]
  );

  const startBattle = () => {
    const difficulty = selectedDifficulty;
    const cardIds = activeDeck?.cards?.length ? activeDeck.cards : DEFAULT_DECK_IDS;
    if (!cardIds.length) {
      toast.error("Deck is empty", { description: "Add cards to your deck before starting a battle." });
      return;
    }
    const playerDeckCards = shuffleCards(cardsFromIds(cardIds)).slice(0, 30);
    const enemyDeckCards = shuffleCards(cardsFromIds(DEFAULT_DECK_IDS)).slice(0, difficulty.enemyDeckSize);
    const playerSigil = activeDeck?.sigil ?? "overload";
    const enemySigil = difficulty.enemySigil;
    storeRef.current.getState().reset({
      mode: "pve",
      playerDeck: playerDeckCards,
      enemyDeck: enemyDeckCards,
      playerSigil,
      enemySigil,
      enemyHp: 50 + difficulty.enemyHpBonus,
      enemyArmor: difficulty.enemyArmor,
      enemyExtraDraw: difficulty.enemyExtraDraw,
      enemyGuaranteedAttackCards: difficulty.enemyGuaranteedAttackCards,
    });
    toast.success(`Launching ${difficulty.name} protocol`);
    setView("play");
  };

  const handleSaveDeck = (deckId: string, payload: { name: string; cards: string[]; sigil: "overload" | "override" }) => {
    updateDeck(deckId, (deck) => ({
      ...deck,
      name: payload.name,
      cards: payload.cards,
      sigil: payload.sigil,
    }));
    toast.success("Deck saved locally");
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white/70">
        Loading local decks…
      </div>
    );
  }

  if (view === "play") {
    return (
      <div className="relative">
        <div className="absolute left-6 top-6 z-20 flex gap-3">
          <Button variant="secondary" className="bg-slate-900/80 text-white" onClick={() => setView("menu")}>
            ← Exit Battle
          </Button>
          <Button
            variant="secondary"
            className="bg-slate-900/80 text-white"
            onClick={startBattle}
          >
            Reboot Match
          </Button>
        </div>
        <GameBoard store={storeRef.current} autoBoot={false} showLog />
      </div>
    );
  }

  if (view === "deck") {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Deck Lab</p>
            <h1 className="text-3xl font-bold">Local Arsenal</h1>
            <p className="text-white/60 max-w-2xl">
              Manage decks stored in your browser. Limited to 30 cards per deck. Changes are instant and never leave your device.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setView("menu")}>
            ← Back to Menu
          </Button>
        </div>
        <DeckManager
          decks={decks}
          activeDeckId={activeDeckId}
          onSelectDeck={setActiveDeck}
          onCreateDeck={createDeck}
          onDeleteDeck={deleteDeck}
          onSaveDeck={handleSaveDeck}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white px-6 py-12">
      <div className="text-center max-w-3xl space-y-4 mb-10">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">Offline Mode</p>
        <h1 className="text-4xl font-bold">{heroCopy.title}</h1>
        <p className="text-white/70">{heroCopy.description}</p>
      </div>
      <div className="w-full max-w-4xl mb-10">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40 mb-3">AI Difficulty</p>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          {DIFFICULTIES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setDifficultyId(option.id)}
              className={cn(
                "rounded-2xl border p-4 text-left transition",
                difficultyId === option.id
                  ? "border-emerald-400 bg-emerald-400/10 shadow-[0_10px_40px_rgba(16,185,129,0.25)]"
                  : "border-white/10 hover:border-white/30 bg-slate-900/60"
              )}
            >
              <p className="text-sm font-semibold">{option.name}</p>
              <p className="text-xs text-white/60 mt-1">{option.description}</p>
              <p className="text-[11px] text-white/40 mt-2 uppercase tracking-[0.3em]">
                {option.enemySigil === "overload" ? "Overload" : "Override"} Sigil
              </p>
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-6 w-full max-w-3xl md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 flex flex-col gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/40">PvE Skirmish</p>
            <h2 className="text-2xl font-semibold">Fight the AI</h2>
            <p className="text-white/60 text-sm mt-2">
              Launch into a match against the adaptive defender. Difficulty: {selectedDifficulty.name}.
            </p>
          </div>
          <Button className="mt-auto" onClick={startBattle}>
            Start Battle
          </Button>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 flex flex-col gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/40">Deck Builder</p>
            <h2 className="text-2xl font-semibold">Customize Arsenal</h2>
            <p className="text-white/60 text-sm mt-2">
              Create, edit, and store decks locally. Perfect for theorycrafting while online services are paused.
            </p>
          </div>
          <Button variant="secondary" className="mt-auto" onClick={() => setView("deck")}>
            Open Deck Manager
          </Button>
        </div>
      </div>
    </div>
  );
}

