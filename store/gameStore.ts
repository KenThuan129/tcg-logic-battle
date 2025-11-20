import { create } from "zustand";
import { createStore } from "zustand/vanilla";
import type { StateCreator } from "zustand";
import { Card, CardColor, Player, PlayerId, SigilType } from "@/lib/types";
import { createPlayerDeck, createEnemyDeck } from "@/lib/cardFactory";
import { main } from "@/lib/gameEngine";

export type GameMode = "pve" | "pvp";

export type SigilRuntimeState = {
  type: SigilType;
  stacks: number;
  lastColor: CardColor | null;
  lastValues: Partial<Record<CardColor, number>>;
  lastTriggeredTurn: number | null;
};

export type ArmorPool = {
  stacks: number;
  reduction: number;
};

export type GameSnapshot = {
  turn: number;
  currentPlayer: PlayerId;
  suddenDeath: boolean;
  gameOver: boolean;
  winner: PlayerId | null;
  player: Player;
  enemy: Player;
  log: string[];
  nextAttackBuff: { player: number; enemy: number };
  nextAttackReduction: { player: number; enemy: number };
  damageOverTime: {
    player: { damage: number; turns: number };
    enemy: { damage: number; turns: number };
  };
  reflectShield: { player: number; enemy: number };
  debuffImmunity: { player: boolean; enemy: boolean };
  mode: GameMode;
  surpriseEvent: string | null;
  surpriseEventTriggered: boolean;
  handLimitActive: boolean;
  sigils: Record<PlayerId, SigilRuntimeState>;
  armor: Record<PlayerId, ArmorPool>;
};

export interface GameStore extends GameSnapshot {

  // Actions
  playCard: (card: Card, playerId: PlayerId) => void;
  drawCard: (playerId: PlayerId, forceDraw?: boolean) => boolean;
  drawToMinimum: (playerId: PlayerId) => void;
  nextTurn: () => void;
  reset: (options?: {
    mode?: GameMode;
    playerDeck?: Card[];
    enemyDeck?: Card[];
    playerSigil?: SigilType;
    enemySigil?: SigilType;
    playerHp?: number;
    enemyHp?: number;
    enemyArmor?: ArmorPool;
    enemyExtraDraw?: number;
    enemyGuaranteedAttackCards?: number;
  }) => void;
  processTurn: () => void;
  checkWinCondition: () => void;
  setMode: (mode: GameMode) => void;
  hydrate: (snapshot: GameSnapshot) => void;
  snapshot: () => GameSnapshot;
}

const INITIAL_HP = 50;
const DEFAULT_MAX_HAND_SIZE = 7;
const MAX_TURNS = 10;
const MIN_HAND_SIZE = 5; // Minimum hand size to maintain after reshuffle
const POST_LIMIT_HAND_SIZE = 5;
const BASE_MANA = 5;
const MANA_INTERVAL_TURNS = 2;
const MAX_MANA_CAP = 30;
const SURPRISE_EVENT_TURN = 5;
const HAND_LIMIT_TURN = 10;

const clone = <T>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

// Helper function to shuffle an array (Fisher-Yates algorithm)
function shuffleDeck<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const getMaxHandSize = (turn: number, mode: GameMode) => {
  if (mode === "pve" && turn > HAND_LIMIT_TURN) {
    return POST_LIMIT_HAND_SIZE;
  }
  return DEFAULT_MAX_HAND_SIZE;
};

const SIGIL_THRESHOLD: Record<SigilType, number> = {
  overload: 3,
  override: 2,
};

const createSigilState = (type: SigilType): SigilRuntimeState => ({
  type,
  stacks: 0,
  lastColor: null,
  lastValues: {},
  lastTriggeredTurn: null,
});

const createArmorState = (player: ArmorPool = { stacks: 0, reduction: 0 }, enemy: ArmorPool = { stacks: 0, reduction: 0 }) => ({
  player: { ...player },
  enemy: { ...enemy },
});

const createGameStoreImpl: StateCreator<GameStore> = (set, get) => {
  const baseDamageOverTime = {
    player: { damage: 0, turns: 0 },
    enemy: { damage: 0, turns: 0 },
  };

  const createReflectShield = () => ({
    player: 0,
    enemy: 0,
  });

  const createDebuffImmunity = () => ({
    player: false,
    enemy: false,
  });

  const recalcManaCap = (turn: number, suddenDeath: boolean) => {
    let cap = BASE_MANA + Math.max(0, Math.floor((turn - 1) / MANA_INTERVAL_TURNS));
    if (suddenDeath && turn > MAX_TURNS) {
      const suddenBonus = Math.max(1, turn - MAX_TURNS);
      cap += suddenBonus * 5;
    }
    return Math.min(cap, MAX_MANA_CAP);
  };

  const refreshMana = (playerId: PlayerId, turn: number, suddenDeath: boolean) => {
    const state = get();
    const entity = state[playerId];
    const newCap = recalcManaCap(turn, suddenDeath);
    const updatedEntity = {
      ...entity,
      maxMana: Math.max(entity.maxMana, newCap),
      mana: Math.max(entity.maxMana, newCap),
    };

    if (updatedEntity.maxMana !== entity.maxMana) {
      set({
        [playerId]: updatedEntity,
        log: [
          ...state.log,
          `🔋 ${playerId === "player" ? "Player" : "Enemy"} mana cap synced to ${updatedEntity.maxMana}`,
        ],
      });
    } else if (updatedEntity.mana !== entity.mana) {
      set({
        [playerId]: updatedEntity,
      });
    }
  };

  const applyDamageOverTime = (playerId: PlayerId) => {
    const state = get();
    const effect = state.damageOverTime[playerId];
    if (effect.turns <= 0 || effect.damage <= 0) {
      return;
    }

    const target = state[playerId];
    const newHp = Math.max(0, target.hp - effect.damage);
    const remainingTurns = effect.turns - 1;

    set({
      [playerId]: {
        ...target,
        hp: newHp,
      },
      damageOverTime: {
        ...state.damageOverTime,
        [playerId]: remainingTurns > 0 ? { ...effect, turns: remainingTurns } : { damage: 0, turns: 0 },
      },
      log: [
        ...state.log,
        `🔥 ${playerId === "player" ? "Player" : "Enemy"} suffers ${effect.damage} burn damage.`,
      ],
    });

    get().checkWinCondition();
  };

  const enforceHandLimitFor = (playerId: PlayerId, maxSize: number) => {
    const state = get();
    const entity = state[playerId];
    if (entity.hand.length <= maxSize) {
      return;
    }

    const excess = entity.hand.length - maxSize;
    const discarded = entity.hand.slice(0, excess);
    const trimmedHand = entity.hand.slice(excess);

    set({
      [playerId]: {
        ...entity,
        hand: trimmedHand,
        discardPile: [...entity.discardPile, ...discarded],
      },
      log: [
        ...state.log,
        `✂️ ${playerId === "player" ? "Player" : "Enemy"} hand trimmed to ${maxSize} cards due to system constraints.`,
      ],
    });
  };

  const surpriseEvents = [
    {
      name: "DDoS Attack",
      description: "All systems lose 3 random cards.",
      apply: () => {
        const state = get();
        const updateEntity = (playerId: PlayerId) => {
          const entity = state[playerId];
          const hand = [...entity.hand];
          const discardPile = [...entity.discardPile];
          const cardsToRemove = Math.min(3, hand.length);
          for (let i = 0; i < cardsToRemove; i++) {
            const index = Math.floor(Math.random() * hand.length);
            const [removed] = hand.splice(index, 1);
            discardPile.push(removed);
          }
          return {
            ...entity,
            hand,
            discardPile,
          };
        };

        set({
          player: updateEntity("player"),
          enemy: updateEntity("enemy"),
          log: [
            ...state.log,
            "🚨 Surprise Event: DDoS Attack! Systems shed random cards.",
          ],
          surpriseEvent: "DDoS Attack",
          surpriseEventTriggered: true,
        });
      },
    },
    {
      name: "A Glitch In Time",
      description: "Retrieve a card from the previous turn.",
      apply: () => {
        const state = get();
        const maxHand = getMaxHandSize(state.turn, state.mode);
        const updateEntity = (playerId: PlayerId) => {
          const entity = state[playerId];
          if (entity.discardPile.length === 0 || entity.hand.length >= maxHand) {
            return entity;
          }
          const discardPile = [...entity.discardPile];
          const restoredCard = discardPile.pop()!;
          return {
            ...entity,
            hand: [...entity.hand, restoredCard],
            discardPile,
          };
        };

        set({
          player: updateEntity("player"),
          enemy: updateEntity("enemy"),
          log: [
            ...state.log,
            "🌀 Surprise Event: A Glitch In Time restores code from the discard pile.",
          ],
          surpriseEvent: "A Glitch In Time",
          surpriseEventTriggered: true,
        });
      },
    },
    {
      name: "ULTIMAX.exe",
      description: "Attacks deal 1.5x true damage.",
      apply: () => {
        const state = get();
        set({
          suddenDeath: true,
          log: [
            ...state.log,
            "💥 Surprise Event: ULTIMAX.exe engaged! All attacks now deal TRUE DAMAGE at 1.5x power.",
          ],
          surpriseEvent: "ULTIMAX.exe",
          surpriseEventTriggered: true,
        });
      },
    },
  ];

  const triggerSurpriseEvent = () => {
    const state = get();
    if (state.mode !== "pve" || state.surpriseEventTriggered || state.turn < SURPRISE_EVENT_TURN) {
      return;
    }
    const event = surpriseEvents[Math.floor(Math.random() * surpriseEvents.length)];
    event.apply();
  };

  const activateHandLimit = () => {
    const state = get();
    if (state.handLimitActive || state.mode !== "pve" || state.turn <= HAND_LIMIT_TURN) {
      return;
    }

    enforceHandLimitFor("player", POST_LIMIT_HAND_SIZE);
    enforceHandLimitFor("enemy", POST_LIMIT_HAND_SIZE);

    set({
      handLimitActive: true,
      log: [
        ...get().log,
        "⚖️ System Compression: Hands are now capped at 5 cards and attack routines are prioritized.",
      ],
    });
  };

  const progressSigil = (card: Card, playerId: PlayerId) => {
    const state = get();
    const sigil = state.sigils[playerId];
    if (!sigil) return;

    const opponentId: PlayerId = playerId === "player" ? "enemy" : "player";
    let log = state.log;
    const nextSigils = { ...state.sigils };
    const sigilState: SigilRuntimeState = { ...sigil };
    let opponent = state[opponentId];
    let nextAttackReduction = { ...state.nextAttackReduction };
    let triggered = false;

    if (sigilState.type === "overload") {
      const sameColor = sigilState.lastColor === card.color;
      sigilState.stacks = sameColor ? sigilState.stacks + 1 : 1;
      sigilState.lastColor = card.color;

      if (sigilState.stacks >= SIGIL_THRESHOLD.overload) {
        triggered = true;
        const damage = 8;
        opponent = { ...opponent, hp: Math.max(0, opponent.hp - damage) };
        sigilState.stacks = 0;
        sigilState.lastTriggeredTurn = state.turn;
        log = [
          ...log,
          `🔥 ${playerId === "player" ? "Player" : "Enemy"} overloads their rig! ${damage} burn damage erupts.`,
        ];
      }
    } else {
      const cardValue = card.value ?? 0;
      const previousValue = sigilState.lastValues[card.color] ?? 0;
      sigilState.stacks = cardValue > previousValue ? sigilState.stacks + 1 : 1;
      sigilState.lastValues = { ...sigilState.lastValues, [card.color]: cardValue };

      if (sigilState.stacks >= SIGIL_THRESHOLD.override) {
        triggered = true;
        sigilState.stacks = 0;
        sigilState.lastTriggeredTurn = state.turn;
        log = [
          ...log,
          `🌀 ${playerId === "player" ? "Player" : "Enemy"} overrides the flow, rewriting the queue!`,
        ];
        setTimeout(() => get().drawCard(playerId, true), 150);
        setTimeout(() => get().drawCard(playerId, true), 330);
        nextAttackReduction = {
          ...nextAttackReduction,
          [playerId]: Math.max(nextAttackReduction[playerId], 4),
        };
      }
    }

    nextSigils[playerId] = sigilState;

    set({
      sigils: nextSigils,
      [opponentId]: opponent,
      nextAttackReduction,
      log,
    });
  };

  return {
  turn: 1,
  currentPlayer: "player",
  suddenDeath: false,
  gameOver: false,
  winner: null,
  player: {
    hp: INITIAL_HP,
    maxHp: INITIAL_HP,
    deck: [],
    hand: [],
    discardPile: [],
    role: "attacker",
    mana: BASE_MANA,
    maxMana: BASE_MANA,
  },
  enemy: {
    hp: INITIAL_HP,
    maxHp: INITIAL_HP,
    deck: [],
    hand: [],
    discardPile: [],
    role: "defender",
    mana: BASE_MANA,
    maxMana: BASE_MANA,
  },
  log: ["Game started!"],
  nextAttackBuff: { player: 0, enemy: 0 },
  nextAttackReduction: { player: 0, enemy: 0 },
  damageOverTime: { ...baseDamageOverTime },
  reflectShield: createReflectShield(),
  debuffImmunity: createDebuffImmunity(),
  mode: "pve",
  surpriseEvent: null,
  surpriseEventTriggered: false,
  handLimitActive: false,
  sigils: {
    player: createSigilState("overload"),
    enemy: createSigilState("override"),
  },
  armor: createArmorState(),

  drawCard: (playerId: PlayerId, forceDraw = false) => {
    const state = get();
    const player = state[playerId];
    
    // Check hand limit (unless force drawing to maintain minimum hand size)
    const maxHandSize = getMaxHandSize(state.turn, state.mode);
    const allowOverdraw = forceDraw && maxHandSize > MIN_HAND_SIZE;
    if (!allowOverdraw && player.hand.length >= maxHandSize) {
      set({
        log: [...state.log, `${playerId === "player" ? "Player" : "Enemy"}: Hand full, cannot draw`],
      });
      return false; // Return false to indicate draw failed
    }
    
    // If deck is empty, reshuffle discard pile into deck
    if (player.deck.length === 0) {
      if (player.discardPile.length === 0) {
        // No cards in discard pile either - completely out of cards
        set({
          log: [...state.log, `${playerId === "player" ? "Player" : "Enemy"}: No cards left!`],
        });
        return false;
      }
      
      // Reshuffle discard pile into deck
      const shuffledDeck = shuffleDeck(player.discardPile);
      
      set({
        [playerId]: {
          ...player,
          deck: shuffledDeck,
          discardPile: [], // Clear discard pile
        },
        log: [...state.log, `🔄 ${playerId === "player" ? "Player" : "Enemy"}: Deck reshuffled from discard pile (${shuffledDeck.length} cards)`],
      });
      
      // Continue drawing after reshuffle
      const newState = get();
      if (newState[playerId].deck.length === 0) {
        return false;
      }
    }
    
    const currentState = get();
    const currentPlayer = currentState[playerId];
    const prioritizeAttacks = currentState.mode === "pve" && currentState.turn > HAND_LIMIT_TURN;
    let drawIndex = 0;
    if (prioritizeAttacks) {
      const preferredIndex = currentPlayer.deck.findIndex((card) => card.meta?.attack || card.color === "red");
      if (preferredIndex >= 0) {
        drawIndex = preferredIndex;
      }
    }
    
    // Draw top card - remove from deck
    const drawnCard = { ...currentPlayer.deck[drawIndex] }; // Create a copy of the card object
    
    // Ensure card is not duplicated
    if (currentPlayer.hand.some(c => c.id === drawnCard.id)) {
      console.error(`Card ${drawnCard.id} already in hand! Cannot draw duplicate.`);
      return false;
    }
    
    const newDeck = currentPlayer.deck.filter((_, index) => index !== drawIndex); // Remove selected card
    const newHand = [...currentPlayer.hand, drawnCard]; // Add to hand
    
    set({
      [playerId]: {
        ...currentPlayer,
        deck: newDeck,
        hand: newHand,
      },
      log: [...currentState.log, `${playerId === "player" ? "Player" : "Enemy"} draws: ${drawnCard.name}`],
    });
    
    return true; // Return true to indicate successful draw
  },
  
  // Draw until hand has minimum cards (for reshuffle scenarios)
  drawToMinimum: (playerId: PlayerId) => {
    const state = get();
    const player = state[playerId];
    
    // Draw cards until hand has MIN_HAND_SIZE or deck runs out
    let drawsNeeded = Math.max(0, MIN_HAND_SIZE - player.hand.length);
    let drawCount = 0;
    const maxIterations = 20; // Safety limit to prevent infinite loops
    
    while (drawsNeeded > 0 && drawCount < maxIterations) {
      const currentState = get();
      const currentPlayer = currentState[playerId];
      
      // Check if we've reached minimum hand size
      if (currentPlayer.hand.length >= MIN_HAND_SIZE) {
        break;
      }
      
      // Try to draw a card (drawCard handles reshuffling automatically)
      const success = get().drawCard(playerId, true); // Force draw
      if (!success) {
        // Can't draw more (deck empty and no discard pile)
        break;
      }
      
      drawCount++;
      drawsNeeded--;
      
      // Small delay between draws to allow animations
      if (drawCount < drawsNeeded) {
        // Only delay if there are more draws needed
        // This will be handled by recursive setTimeout calls if needed
      }
    }
    
    if (drawCount > 0) {
      const finalState = get();
      const finalPlayer = finalState[playerId];
      const logEntry = `📚 ${playerId === "player" ? "Player" : "Enemy"}: Hand refilled to ${finalPlayer.hand.length} cards`;
      
      // Update log without duplicating
      if (!finalState.log.includes(logEntry)) {
        set({
          log: [...finalState.log, logEntry],
        });
      }
    }
  },

  playCard: (card: Card, playerId: PlayerId) => {
    const state = get();
    
    if (state.gameOver) return;
    if (state.currentPlayer !== playerId) return;
    
    const player = state[playerId];
    const manaCost = card.manaCost ?? 0;
    
    if (player.mana < manaCost) {
      set({
        log: [
          ...state.log,
          `⚠️ ${playerId === "player" ? "Player" : "Enemy"} tried to run ${card.name} but lacked mana (${player.mana}/${manaCost}).`,
        ],
      });
      return;
    }
    
    // Add discard log entry
    const discardLogEntry = `🗃️ ${card.name} queued (${card.color.toUpperCase()})`;
    
    // Execute card effect first (before removing from hand to allow animation)
    const actionState = {
      playerHp: state.player.hp,
      enemyHp: state.enemy.hp,
      playerMaxHp: state.player.maxHp,
      enemyMaxHp: state.enemy.maxHp,
      playerHand: state.player.hand,
      enemyHand: state.enemy.hand,
      log: [...state.log, discardLogEntry],
      nextAttackBuff: { ...state.nextAttackBuff },
      nextAttackReduction: { ...state.nextAttackReduction },
      damageOverTime: {
        player: { ...state.damageOverTime.player },
        enemy: { ...state.damageOverTime.enemy },
      },
      reflectShield: { ...state.reflectShield },
      debuffImmunity: { ...state.debuffImmunity },
      suddenDeath: state.suddenDeath,
      armor: {
        player: { ...state.armor.player },
        enemy: { ...state.armor.enemy },
      },
    };
    
    const resultState = main(actionState, card, playerId);
    
    const updatedPlayer = {
      ...state.player,
      hp: resultState.playerHp,
      maxHp: resultState.playerMaxHp ?? state.player.maxHp,
      hand: resultState.playerHand,
      mana: playerId === "player" ? Math.max(0, state.player.mana - manaCost) : state.player.mana,
    };
    
    const updatedEnemy = {
      ...state.enemy,
      hp: resultState.enemyHp,
      maxHp: resultState.enemyMaxHp ?? state.enemy.maxHp,
      hand: resultState.enemyHand,
      mana: playerId === "enemy" ? Math.max(0, state.enemy.mana - manaCost) : state.enemy.mana,
    };
    
    set({
      player: updatedPlayer,
      enemy: updatedEnemy,
      log: resultState.log,
      nextAttackBuff: { ...resultState.nextAttackBuff },
      nextAttackReduction: { ...resultState.nextAttackReduction },
      damageOverTime: { ...resultState.damageOverTime },
      reflectShield: { ...resultState.reflectShield },
      debuffImmunity: { ...resultState.debuffImmunity },
      armor: {
        player: { ...resultState.armor.player },
        enemy: { ...resultState.armor.enemy },
      },
    });

    progressSigil(card, playerId);
    
    // Remove card from hand AFTER discard animation completes (600ms delay)
    // This prevents new cards from appearing in the same slot during animation
    setTimeout(() => {
      const currentState = get();
      const currentPlayer = currentState[playerId];
      
      // Remove card from hand and add to discard pile
      const newHand = currentPlayer.hand.filter((c) => c.id !== card.id);
      const newDeck = currentPlayer.deck.filter((c) => c.id !== card.id);
      const newDiscardPile = [...currentPlayer.discardPile, { ...card }]; // Add to discard pile
      
      set({
        [playerId]: {
          ...currentPlayer,
          hand: newHand, // Card removed from hand
          deck: newDeck, // Ensure card is not in deck
          discardPile: newDiscardPile, // Card added to discard pile
        },
      });
      
      // If deck is now empty, trigger reshuffle and refill hand
      const updatedState = get();
      const updatedPlayer = updatedState[playerId];
      
      if (updatedPlayer.deck.length === 0 && updatedPlayer.discardPile.length > 0) {
        // Deck is empty, trigger reshuffle and refill
        setTimeout(() => {
          get().drawToMinimum(playerId);
        }, 200);
      }
    }, 600); // Match the discard animation duration
    
    // Check win condition
    get().checkWinCondition();
    
    // Process draw if needed (utility cards that draw)
    // Wait for discard animation to complete (600ms) plus buffer before drawing new card
    // This ensures the old card is removed from hand before new card appears
    const bonusDraws = card.meta?.utility?.draw ?? 0;
    if (bonusDraws > 0) {
      Array.from({ length: bonusDraws }).forEach((_, index) => {
        setTimeout(() => {
          const currentState = get();
          if (currentState.gameOver) return;
          get().drawCard(playerId);
        }, 700 + index * 120);
      });
    }
    
    // Auto-advance turn after playing card
    setTimeout(() => {
      const currentState = get();
      if (currentState.gameOver) return;
      
      get().nextTurn();
    }, 1000);
  },

  processTurn: () => {
    const state = get();

    if (state.mode !== "pve") {
      return;
    }
    
    if (state.currentPlayer === "enemy" && !state.gameOver) {
      // AI: Enemy plays a random card
      setTimeout(() => {
        const currentState = get();
        if (currentState.gameOver || currentState.currentPlayer !== "enemy") return;
        
        const enemyHand = currentState.enemy.hand;
        if (enemyHand.length > 0) {
          const affordable = enemyHand.filter((card) => card.manaCost <= currentState.enemy.mana);
          if (affordable.length === 0) {
            set({
              log: [
                ...currentState.log,
                "🤖 Enemy systems waiting for mana recharge...",
              ],
            });
            setTimeout(() => {
              get().nextTurn();
            }, 500);
            return;
          }
          const randomCard = affordable[Math.floor(Math.random() * affordable.length)];
          get().playCard(randomCard, "enemy");
        } else {
          // No cards, just pass turn (nextTurn will handle drawing for player)
          setTimeout(() => {
            get().nextTurn();
          }, 500);
        }
      }, 1000);
    }
  },

  nextTurn: () => {
    const state = get();
    
    if (state.gameOver) return;
    
    const wasEnemyTurn = state.currentPlayer === "enemy";
    const newCurrentPlayer = state.currentPlayer === "player" ? "enemy" : "player";
    const newTurn = newCurrentPlayer === "player" ? state.turn + 1 : state.turn;
    
    // Check for sudden death
    let suddenDeath = state.suddenDeath;
    if (newTurn > MAX_TURNS && !suddenDeath) {
      suddenDeath = true;
      set({
        log: [...state.log, "⚡ SUDDEN DEATH MODE! All attacks deal 1.5x damage!"],
      });
    }
    
    set({
      currentPlayer: newCurrentPlayer,
      turn: newTurn,
      suddenDeath,
    });
    
    refreshMana(newCurrentPlayer, newTurn, suddenDeath);
    applyDamageOverTime(newCurrentPlayer);
    
    if (newCurrentPlayer === "enemy") {
      // Enemy turn starting - draw card and process enemy AI if enabled
      get().drawCard("enemy");
      if (get().mode === "pve") {
        get().processTurn();
      }
    } else if (wasEnemyTurn) {
      // Enemy turn just ended, now it's player turn - draw card for player
      setTimeout(() => {
        const newState = get();
        if (!newState.gameOver && newState.currentPlayer === "player") {
          get().drawCard("player");
        }
      }, 500);
    }
    // If player turn -> enemy turn, drawing happens when enemy turn starts above

    if (newCurrentPlayer === "player") {
      if (newTurn >= SURPRISE_EVENT_TURN && !get().surpriseEventTriggered) {
        triggerSurpriseEvent();
      }
      if (newTurn > HAND_LIMIT_TURN) {
        activateHandLimit();
      }
    }
  },

  checkWinCondition: () => {
    const state = get();
    
    if (state.player.hp <= 0) {
      set({
        gameOver: true,
        winner: "enemy",
        log: [...state.log, "💀 Game Over! Enemy Wins!"],
      });
      return;
    }
    
    if (state.enemy.hp <= 0) {
      set({
        gameOver: true,
        winner: "player",
        log: [...state.log, "🎉 Game Over! Player Wins!"],
      });
      return;
    }
    
    // Check for draw (turn limit reached and both still alive)
    if (state.turn > MAX_TURNS * 2 && !state.suddenDeath) {
      // This is handled in sudden death, but if it continues...
      const turnsSinceSuddenDeath = state.turn - MAX_TURNS * 2;
      if (turnsSinceSuddenDeath > 5) {
        set({
          gameOver: true,
          winner: null,
          log: [...state.log, "🤝 Game ends in a Draw!"],
        });
      }
    }
  },

  reset: (options) => {
    const providedPlayerDeck = options?.playerDeck ?? null;
    const providedEnemyDeck = options?.enemyDeck ?? null;
    const playerDeck = clone(providedPlayerDeck ?? createPlayerDeck());
    const enemyDeck = clone(providedEnemyDeck ?? createEnemyDeck());
    
    // Draw initial hands (5 cards each)
    const playerHand: Card[] = [];
    const enemyHand: Card[] = [];
    
    for (let i = 0; i < 5; i++) {
      if (playerDeck.length > 0) {
        playerHand.push(playerDeck.shift()!);
      }
      if (enemyDeck.length > 0) {
        enemyHand.push(enemyDeck.shift()!);
      }
    }

    if (options?.enemyGuaranteedAttackCards) {
      let required = options.enemyGuaranteedAttackCards;
      const count = enemyHand.filter((card) => card.color === "red").length;
      required = Math.max(0, required - count);
      while (required > 0) {
        const attackIndex = enemyDeck.findIndex((card) => card.color === "red");
        if (attackIndex === -1) break;
        const replacementIndex = enemyHand.findIndex((card) => card.color !== "red");
        if (replacementIndex === -1) break;
        const [attackCard] = enemyDeck.splice(attackIndex, 1);
        const displaced = enemyHand[replacementIndex];
        enemyHand[replacementIndex] = attackCard;
        if (displaced) {
          enemyDeck.push(displaced);
        }
        required--;
      }
    }

    if (options?.enemyExtraDraw) {
      for (let i = 0; i < options.enemyExtraDraw; i++) {
        if (enemyDeck.length === 0) break;
        enemyHand.push(enemyDeck.shift()!);
      }
    }

    const nextMode = options?.mode ?? get().mode ?? "pve";
    const playerSigil = options?.playerSigil ?? "overload";
    const enemySigil = options?.enemySigil ?? "override";
    const playerMaxHp = options?.playerHp ?? INITIAL_HP;
    const enemyMaxHp = options?.enemyHp ?? INITIAL_HP;

    set({
      turn: 1,
      currentPlayer: "player",
      suddenDeath: false,
      gameOver: false,
      winner: null,
      player: {
        hp: playerMaxHp,
        maxHp: playerMaxHp,
        deck: playerDeck,
        hand: playerHand,
        discardPile: [],
        role: "attacker",
        mana: BASE_MANA,
        maxMana: BASE_MANA,
      },
      enemy: {
        hp: enemyMaxHp,
        maxHp: enemyMaxHp,
        deck: enemyDeck,
        hand: enemyHand,
        discardPile: [],
        role: "defender",
        mana: BASE_MANA,
        maxMana: BASE_MANA,
      },
      log: ["Game started! Click a card to play."],
      nextAttackBuff: { player: 0, enemy: 0 },
      nextAttackReduction: { player: 0, enemy: 0 },
      damageOverTime: { ...baseDamageOverTime },
      reflectShield: createReflectShield(),
      debuffImmunity: createDebuffImmunity(),
      mode: nextMode,
      surpriseEvent: null,
      surpriseEventTriggered: false,
      handLimitActive: false,
      sigils: {
        player: createSigilState(playerSigil),
        enemy: createSigilState(enemySigil),
      },
      armor: createArmorState(
        { stacks: 0, reduction: 0 },
        options?.enemyArmor ?? { stacks: 0, reduction: 0 }
      ),
    });
  },
  setMode: (mode) => {
    set({ mode });
  },
  hydrate: (snapshot) => {
    set((state) => ({
      ...state,
      ...clone(snapshot),
    }));
  },
  snapshot: () => {
    const state = get();
    return clone({
      turn: state.turn,
      currentPlayer: state.currentPlayer,
      suddenDeath: state.suddenDeath,
      gameOver: state.gameOver,
      winner: state.winner,
      player: state.player,
      enemy: state.enemy,
      log: state.log,
      nextAttackBuff: state.nextAttackBuff,
      nextAttackReduction: state.nextAttackReduction,
      damageOverTime: state.damageOverTime,
      reflectShield: state.reflectShield,
      debuffImmunity: state.debuffImmunity,
      mode: state.mode,
      surpriseEvent: state.surpriseEvent,
      surpriseEventTriggered: state.surpriseEventTriggered,
      handLimitActive: state.handLimitActive,
      sigils: state.sigils,
      armor: state.armor,
    });
  },
};
};

export const gameStoreApi = createStore<GameStore>()(createGameStoreImpl);
export const createGameStore = () => createStore<GameStore>()(createGameStoreImpl);

