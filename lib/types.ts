export type CardColor = "red" | "yellow" | "green";
export type CardType = "primary" | "supplementary";
export type PlayerRole = "attacker" | "defender";
export type PlayerId = "player" | "enemy";
export type SigilType = "overload" | "override";

export type DamageFlavor =
  | "normal"
  | "true"
  | "critical"
  | "omnivamp"
  | "dot";

export interface AttackMeta {
  flavor?: DamageFlavor;
  criticalMultiplier?: number;
  lifestealPct?: number;
  dot?: {
    damage: number;
    duration: number;
    trueDamage?: boolean;
  };
  bypassShield?: boolean;
}

export interface DefenseMeta {
  block?: number;
  deflect?: number;
  cleanse?: boolean;
  heal?: number;
  debuffImmunity?: boolean;
}

export interface UtilityMeta {
  attackBuff?: number;
  defenseBuff?: number;
  enemyWeaken?: number;
  heal?: number;
  draw?: number;
}

export interface CardMeta {
  attack?: AttackMeta;
  defense?: DefenseMeta;
  utility?: UtilityMeta;
}

export interface Card {
  id: string;
  name: string;
  color: CardColor;
  type: CardType;
  value: number;
  description: string;
  manaCost: number;
  meta?: CardMeta;
}

export interface Player {
  hp: number;
  maxHp: number;
  deck: Card[];
  hand: Card[];
  discardPile: Card[];
  role: PlayerRole;
  mana: number;
  maxMana: number;
}

export interface GameState {
  turn: number;
  currentPlayer: PlayerId;
  suddenDeath: boolean;
  gameOver: boolean;
  winner: PlayerId | null;
  player: Player;
  enemy: Player;
  log: string[];
  playCard: (card: Card, playerId: PlayerId) => void;
  drawCard: (playerId: PlayerId) => void;
  nextTurn: () => void;
  reset: () => void;
  processTurn: () => void;
}

