import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_DECK_IDS } from "@/lib/cards/pool";
import type { SigilType } from "@/lib/types";

export type LocalDeck = {
  id: string;
  name: string;
  cards: string[];
  sigil: SigilType;
};

type DeckState = {
  decks: LocalDeck[];
  activeDeckId: string;
};

const STORAGE_KEY = "it-colosseum.localDecks.v1";

const DEFAULT_STATE: DeckState = {
  decks: [
    {
      id: "starter",
      name: "Starter Arsenal",
      cards: DEFAULT_DECK_IDS,
      sigil: "overload",
    },
  ],
  activeDeckId: "starter",
};

const safeParse = (value: string | null): DeckState | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as DeckState;
    if (!parsed.decks?.length) return null;
    return {
      ...parsed,
      decks: parsed.decks.map((deck) => ({
        ...deck,
        sigil: deck.sigil ?? "overload",
      })),
    };
  } catch {
    return null;
  }
};

export function useLocalDecks() {
  const [state, setState] = useState<DeckState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = safeParse(window.localStorage.getItem(STORAGE_KEY));
    if (stored) {
      setState(stored);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const setActiveDeck = useCallback((deckId: string) => {
    setState((prev) => ({
      ...prev,
      activeDeckId: deckId,
    }));
  }, []);

  const createDeck = useCallback(() => {
    const id = crypto.randomUUID();
    const newDeck: LocalDeck = {
      id,
      name: "Custom Deck",
      cards: DEFAULT_DECK_IDS.slice(0, 20),
      sigil: "overload",
    };
    setState((prev) => ({
      ...prev,
      decks: [...prev.decks, newDeck],
      activeDeckId: id,
    }));
    return id;
  }, []);

  const updateDeck = useCallback((deckId: string, updater: (deck: LocalDeck) => LocalDeck) => {
    setState((prev) => ({
      ...prev,
      decks: prev.decks.map((deck) => (deck.id === deckId ? updater(deck) : deck)),
    }));
  }, []);

  const deleteDeck = useCallback((deckId: string) => {
    setState((prev) => {
      if (prev.decks.length <= 1) {
        return prev;
      }
      const filtered = prev.decks.filter((deck) => deck.id !== deckId);
      const activeDeckId =
        prev.activeDeckId === deckId ? filtered[0]?.id ?? DEFAULT_STATE.activeDeckId : prev.activeDeckId;
      return {
        decks: filtered,
        activeDeckId,
      };
    });
  }, []);

  const decks = useMemo(
    () =>
      state.decks.map((deck) => ({
        ...deck,
        cards: Array.from(new Set(deck.cards)).slice(0, 30),
      })),
    [state.decks]
  );

  return {
    hydrated,
    decks,
    activeDeckId: state.activeDeckId,
    setActiveDeck,
    createDeck,
    updateDeck,
    deleteDeck,
  };
}

