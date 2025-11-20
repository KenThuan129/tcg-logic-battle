"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import type { StoreApi } from "zustand";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { Card as CardType, PlayerId } from "@/lib/types";
import { Card } from "./Card";
import { gameStoreApi, type GameStore } from "@/store/gameStore";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

interface HandProps {
  cards: CardType[];
  playerId: PlayerId;
  isEnemy?: boolean;
  store?: StoreApi<GameStore>;
  concealCards?: boolean;
  className?: string;
}

export function Hand({ cards, playerId, isEnemy = false, store, concealCards = false, className }: HandProps) {
  const boundStore = store ?? gameStoreApi;
  const { playCard, currentPlayer, gameOver, player, enemy } = useStore(
    boundStore,
    useShallow((state) => ({
      playCard: state.playCard,
      currentPlayer: state.currentPlayer,
      gameOver: state.gameOver,
      player: state.player,
      enemy: state.enemy,
    }))
  );
  const canPlay = currentPlayer === playerId && !gameOver;
  const [discardingCardId, setDiscardingCardId] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const previousCardIdsRef = useRef<string>("");
  const currentMana = playerId === "player" ? player.mana : enemy.mana;

  // Handle card click with discard animation
  const handleCardClick = (card: CardType) => {
    if (!canPlay || discardingCardId) return;
    if ((card.manaCost ?? 0) > currentMana) return;
    
    // Start discard animation
    setDiscardingCardId(card.id);
    
    // Play card after a brief delay to show animation start
    setTimeout(() => {
      playCard(card, playerId);
      
      // Keep discarding state for full animation duration (350ms) + buffer
      // This prevents new cards from appearing in the same slot during animation
      setTimeout(() => {
        setDiscardingCardId(null);
      }, 600); // Longer than animation (350ms) to ensure visual clear
    }, 50);
  };

  // Clear discarding state when cards change (card was removed) or when game resets
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (discardingCardId && !cards.find(c => c.id === discardingCardId)) {
      setDiscardingCardId(null);
    }
  }, [cards, discardingCardId]);

  // Reset local state when cards are completely replaced (game reset)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const currentCardIds = JSON.stringify(cards.map(c => c.id).sort());
    if (previousCardIdsRef.current && previousCardIdsRef.current !== currentCardIds) {
      // Cards changed - if it's a complete replacement (reset), clear states
      if (cards.length === 5) {
        // Likely a reset (initial hand size)
        setHoveredCardId(null);
        setDiscardingCardId(null);
      }
    }
    if (!previousCardIdsRef.current) {
      // First render - store initial state
      previousCardIdsRef.current = currentCardIds;
    } else {
      previousCardIdsRef.current = currentCardIds;
    }
  }, [cards]);

  // Always show 7 slots even when fewer cards exist
  const maxSlots = 7;
  const slots = Array.from({ length: maxSlots }, (_, i) => i);

  return (
    <div className={cn("w-full h-72 flex items-center justify-center px-4", className)}>
      <div className="flex flex-wrap items-center justify-center gap-4 max-w-5xl">
        {slots.map((slotIndex) => {
          const card = cards[slotIndex];

          if (!card) {
            // Empty slot - only show if we have fewer than 7 cards
            if (slotIndex < 7) {
              return (
                <div
                  key={`empty-${slotIndex}`}
                  className="w-32 h-44 flex-shrink-0 opacity-30"
                >
                  <div className="w-full h-full border-2 border-dashed border-white/20 rounded-lg" />
                </div>
              );
            }
            return null;
          }

          const isDiscarding = discardingCardId === card.id;
          const isHovered = hoveredCardId === card.id;

        return (
          <div
            key={card.id}
            className={cn(
              "shrink-0 transition-opacity duration-200 relative",
              hoveredCardId && hoveredCardId !== card.id && "opacity-40",
              // Hide the slot entirely during discard animation to prevent visual overlap
              isDiscarding && "pointer-events-none"
            )}
            style={{
              zIndex: isHovered ? 50 : isDiscarding ? 100 : 10,
            }}
          >
            <Card
              card={card}
              onClick={() => handleCardClick(card)}
              disabled={!canPlay || !!discardingCardId}
              isEnemy={isEnemy}
              isDiscarding={isDiscarding}
              isHovered={isHovered}
              hidden={concealCards && isEnemy}
              unaffordable={(card.manaCost ?? 0) > currentMana}
              onHover={(hovered) => {
                if (concealCards && isEnemy) return;
                if (hovered && !isDiscarding) {
                  setHoveredCardId(card.id);
                } else if (hoveredCardId === card.id) {
                  setHoveredCardId(null);
                }
              }}
            />
          </div>
        );
        })}
      </div>
    </div>
  );
}

/* eslint-enable react-hooks/set-state-in-effect */
