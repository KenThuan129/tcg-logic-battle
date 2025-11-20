import type { Card } from "./types";
import { CARD_LIBRARY, cloneCard } from "./cards/pool";

const shuffleDeck = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const cloneDeck = (cards: Card[]): Card[] => cards.map((card) => cloneCard(card));

export function createPlayerDeck(): Card[] {
  return shuffleDeck(cloneDeck(CARD_LIBRARY));
}

export function createEnemyDeck(): Card[] {
  return shuffleDeck(cloneDeck(CARD_LIBRARY));
}

