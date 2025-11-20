"use client";

import { useEffect, useMemo, useState } from "react";
import { Card as CardType, SigilType } from "@/lib/types";
import { CARD_LIBRARY } from "@/lib/cards/pool";
import { LocalDeck } from "@/hooks/useLocalDecks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Trash2, Flame, Sparkles } from "lucide-react";

type DeckManagerProps = {
  decks: LocalDeck[];
  activeDeckId: string;
  onSelectDeck: (deckId: string) => void;
  onCreateDeck: () => void;
  onDeleteDeck: (deckId: string) => void;
  onSaveDeck: (deckId: string, payload: { name: string; cards: string[]; sigil: SigilType }) => void;
};

const MAX_CARDS = 30;

const colors: Record<CardType["color"], { label: string; styles: string }> = {
  red: { label: "Attack", styles: "bg-red-500/10 text-red-200 border-red-500/30" },
  yellow: { label: "Defend", styles: "bg-amber-500/10 text-amber-200 border-amber-500/30" },
  green: { label: "Support", styles: "bg-emerald-500/10 text-emerald-200 border-emerald-500/30" },
};

export function DeckManager({
  decks,
  activeDeckId,
  onSelectDeck,
  onCreateDeck,
  onDeleteDeck,
  onSaveDeck,
}: DeckManagerProps) {
  const activeDeck = decks.find((deck) => deck.id === activeDeckId) ?? decks[0];
  const [name, setName] = useState(activeDeck?.name ?? "");
  const [cards, setCards] = useState<string[]>(activeDeck?.cards ?? []);
  const [sigil, setSigil] = useState<SigilType>(activeDeck?.sigil ?? "overload");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setName(activeDeck?.name ?? "");
    setCards(activeDeck?.cards ?? []);
    setSigil(activeDeck?.sigil ?? "overload");
  }, [activeDeck?.cards, activeDeck?.name, activeDeck?.sigil]);

  const availableCards = useMemo(() => {
    return CARD_LIBRARY.filter((card) =>
      `${card.name} ${card.description}`.toLowerCase().includes(filter.toLowerCase())
    );
  }, [filter]);

  const cardCountLabel = `${cards.length}/${MAX_CARDS}`;

  const toggleCard = (cardId: string) => {
    setCards((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      }
      if (prev.length >= MAX_CARDS) {
        toast.warning("Deck limit reached", { description: "Remove a card before adding another." });
        return prev;
      }
      return [...prev, cardId];
    });
  };

  if (!activeDeck) {
    return null;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr] overflow-y-auto">
      <Card className="bg-slate-900/70 border-white/10">
        <CardHeader>
          <CardTitle>Your Decks</CardTitle>
          <CardDescription>Build unlimited local decks. Data stays on this device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={onCreateDeck}>
            Create Deck
          </Button>
          <ScrollArea className="h-[360px] pr-2">
            <div className="space-y-2">
              {decks.map((deck) => (
                <button
                  key={deck.id}
                  type="button"
                  onClick={() => onSelectDeck(deck.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    deck.id === activeDeckId ? "border-emerald-400 bg-emerald-400/10" : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center justify-between text-white">
                    <p className="font-semibold">{deck.name}</p>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-white/50">
                      {deck.sigil === "overload" ? "Overload" : "Override"}
                    </span>
                  </div>
                  <p className="text-xs text-white/60">{deck.cards.length} cards</p>
                </button>
              ))}
            </div>
          </ScrollArea>
          <Button
            variant="ghost"
            className="w-full text-red-400 hover:text-red-300"
            disabled={decks.length <= 1}
            onClick={() => onDeleteDeck(activeDeck.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Deck
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/70 border-white/10">
        <CardHeader>
          <CardTitle>Edit Deck</CardTitle>
          <CardDescription>Rename, reorder, and select cards for this deck.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="space-y-3">
              <label className="text-xs uppercase tracking-[0.4em] text-white/40">Deck Name</label>
              <Input
                className="bg-slate-950/60 border-white/10"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.4em] text-white/40">Sigil</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "overload", label: "Overload", icon: <Flame className="h-4 w-4 text-orange-400" /> },
                    { value: "override", label: "Override", icon: <Sparkles className="h-4 w-4 text-sky-300" /> },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSigil(option.value)}
                      className={`rounded-2xl border px-3 py-3 text-left transition ${
                        sigil === option.value ? "border-emerald-400 bg-emerald-400/10" : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <p className="flex items-center gap-2 font-semibold text-white">
                        {option.icon}
                        {option.label}
                      </p>
                      <p className="text-xs text-white/50">
                        {option.value === "overload"
                          ? "Chain same-type cards to build Burning stacks."
                          : "Play stronger combos to rewrite the field."}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <Separator className="bg-white/10" />
              <div className="flex items-center justify-between text-sm text-white/60">
                <span>Deck Size</span>
                <span className="text-white">{cardCountLabel}</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/60 h-64 overflow-y-auto">
                {cards.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-white/50 px-4 text-center">
                    No cards yet. Add cards from the library on the right.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {cards.map((cardId) => {
                      const card = CARD_LIBRARY.find((item) => item.id === cardId);
                      if (!card) return null;
                      return (
                        <div key={cardId} className="flex items-center justify-between px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-white">{card.name}</p>
                            <p className="text-xs text-white/50">
                              {card.color} · Mana {card.manaCost}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => toggleCard(cardId)}>
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-[0.4em] text-white/40">Card Library</label>
                <Button
                  className="bg-emerald-500 text-black hover:bg-emerald-400"
                  onClick={() =>
                    onSaveDeck(activeDeck.id, { name: name.trim() || "Unnamed Deck", cards, sigil })
                  }
                >
                  Save Deck
                </Button>
              </div>
              <Input
                placeholder="Search cards..."
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="bg-slate-950/60 border-white/10"
              />
              <ScrollArea className="h-[420px] pr-2">
                <div className="space-y-2">
                  {availableCards.map((card) => {
                    const selected = cards.includes(card.id);
                    return (
                      <div
                        key={card.id}
                        className={`rounded-xl border px-3 py-2 text-sm ${
                          selected ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-slate-950/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-white">{card.name}</p>
                              <Badge className={`border ${colors[card.color].styles}`}>
                                {colors[card.color].label}
                              </Badge>
                            </div>
                            <p className="text-xs text-white/60">{card.description}</p>
                            <p className="text-[11px] text-white/40">
                              Mana {card.manaCost} · Value {card.value}
                            </p>
                          </div>
                          <Button variant="secondary" size="sm" onClick={() => toggleCard(card.id)}>
                            {selected ? "Remove" : "Add"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

