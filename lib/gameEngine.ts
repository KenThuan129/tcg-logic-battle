import { Card, PlayerId } from "./types";

interface GameActionState {
  playerHp: number;
  enemyHp: number;
  playerMaxHp: number;
  enemyMaxHp: number;
  playerHand: Card[];
  enemyHand: Card[];
  log: string[];
  nextAttackBuff: { player: number; enemy: number };
  nextAttackReduction: { player: number; enemy: number };
  damageOverTime: {
    player: { damage: number; turns: number };
    enemy: { damage: number; turns: number };
  };
  reflectShield: { player: number; enemy: number };
  debuffImmunity: { player: boolean; enemy: boolean };
  suddenDeath?: boolean;
  armor: {
    player: { stacks: number; reduction: number };
    enemy: { stacks: number; reduction: number };
  };
}

const cloneState = (state: GameActionState) => ({
  ...state,
  playerHand: [...state.playerHand],
  enemyHand: [...state.enemyHand],
  log: [...state.log],
  nextAttackBuff: { ...state.nextAttackBuff },
  nextAttackReduction: { ...state.nextAttackReduction },
  damageOverTime: {
    player: { ...state.damageOverTime.player },
    enemy: { ...state.damageOverTime.enemy },
  },
  reflectShield: { ...state.reflectShield },
  debuffImmunity: { ...state.debuffImmunity },
  armor: {
    player: { ...state.armor.player },
    enemy: { ...state.armor.enemy },
  },
});

const attackerKey = (targetPlayerId: PlayerId) =>
  targetPlayerId === "enemy" ? "player" : "enemy";

const attackerName = (playerId: PlayerId) =>
  playerId === "player" ? "Player" : "Enemy";

const defenderName = (playerId: PlayerId) =>
  playerId === "player" ? "Player" : "Enemy";

const clampHp = (current: number, max: number) =>
  Math.min(Math.max(current, 0), max);

export function attack(
  state: GameActionState,
  card: Card,
  targetPlayerId: PlayerId
): GameActionState {
  const newState = cloneState(state);
  const attacker = attackerKey(targetPlayerId);
  const attackerLabel = attackerName(attacker);
  const defenderLabel = defenderName(targetPlayerId);
  const meta = card.meta?.attack;

  const bypassShield = Boolean(meta?.bypassShield || meta?.flavor === "true");
  const isTrueDamage = meta?.flavor === "true";
  let damage = card.value + state.nextAttackBuff[attacker];

  const shield = bypassShield ? 0 : state.nextAttackReduction[targetPlayerId];
  damage -= shield;
  damage = Math.max(1, damage);

  if (meta?.criticalMultiplier && meta.criticalMultiplier > 1) {
    damage = Math.floor(damage * meta.criticalMultiplier);
    newState.log.push(`💥 ${card.name} spikes critical x${meta.criticalMultiplier.toFixed(1)}.`);
  }

  if (state.suddenDeath) {
    damage = Math.floor(damage * 1.5);
  }

  const armorState = newState.armor[targetPlayerId];
  if (!isTrueDamage && armorState?.stacks > 0 && armorState.reduction > 0) {
    const reduction = Math.min(damage, armorState.reduction);
    damage = Math.max(0, damage - reduction);
    armorState.stacks = Math.max(0, armorState.stacks - 1);
    newState.log.push(
      `🛡️ ${defenderLabel}'s armor absorbs ${reduction} damage (${armorState.stacks} stack${
        armorState.stacks === 1 ? "" : "s"
      } left).`
    );
  }

  if (targetPlayerId === "enemy") {
    newState.enemyHp = Math.max(0, state.enemyHp - damage);
  } else {
    newState.playerHp = Math.max(0, state.playerHp - damage);
  }

  const reflectValue = state.reflectShield[targetPlayerId];
  if (reflectValue > 0) {
    const reflected = Math.min(damage, reflectValue);
    if (targetPlayerId === "enemy") {
      newState.playerHp = Math.max(0, newState.playerHp - reflected);
    } else {
      newState.enemyHp = Math.max(0, newState.enemyHp - reflected);
    }
    newState.reflectShield[targetPlayerId] = 0;
    newState.log.push(`🪞 ${defenderLabel} deflects ${reflected} damage back!`);
  }

  if (meta?.lifestealPct) {
    const heal = Math.max(1, Math.floor(damage * meta.lifestealPct));
    if (targetPlayerId === "enemy") {
      newState.playerHp = clampHp(newState.playerHp + heal, state.playerMaxHp);
    } else {
      newState.enemyHp = clampHp(newState.enemyHp + heal, state.enemyMaxHp);
    }
    newState.log.push(`🩸 ${card.name} siphons ${heal} HP via omnivamp.`);
  }

  if (meta?.dot) {
    if (state.debuffImmunity[targetPlayerId]) {
      newState.debuffImmunity[targetPlayerId] = false;
      newState.log.push(`🧼 ${defenderLabel} firewall ignores lingering damage.`);
    } else {
      const currentDot = newState.damageOverTime[targetPlayerId];
      newState.damageOverTime[targetPlayerId] = {
        damage: currentDot.damage + meta.dot.damage,
        turns: Math.max(currentDot.turns, meta.dot.duration),
      };
      newState.log.push(
        `🔥 ${card.name} applies ${meta.dot.damage} burn for ${meta.dot.duration} turns.`
      );
    }
  }

  newState.log.push(
    `⚔️ ${attackerLabel} executes ${card.name} dealing ${damage}${
      meta?.flavor === "true" ? " true" : ""
    } damage.`
  );

  newState.nextAttackBuff[attacker] = 0;
  if (!bypassShield) {
    newState.nextAttackReduction[targetPlayerId] = 0;
  }

  return newState;
}

export function defend(
  state: GameActionState,
  card: Card,
  targetPlayerId: PlayerId
): GameActionState {
  const newState = cloneState(state);
  const defenderLabel = defenderName(targetPlayerId);
  const meta = card.meta?.defense ?? {};

  if (meta.block) {
    newState.nextAttackReduction[targetPlayerId] = meta.block;
    newState.log.push(`🛡️ ${defenderLabel} deploys block: -${meta.block} incoming damage.`);
  }

  if (meta.deflect) {
    newState.reflectShield[targetPlayerId] = meta.deflect;
    newState.log.push(`🪞 ${defenderLabel} arms reflect for ${meta.deflect} damage.`);
  }

  if (meta.cleanse) {
    newState.damageOverTime[targetPlayerId] = { damage: 0, turns: 0 };
    newState.log.push(`🧼 ${defenderLabel} purges lingering effects.`);
  }

  if (meta.heal) {
    if (targetPlayerId === "player") {
      newState.playerHp = clampHp(state.playerHp + meta.heal, state.playerMaxHp);
    } else {
      newState.enemyHp = clampHp(state.enemyHp + meta.heal, state.enemyMaxHp);
    }
    newState.log.push(`➕ ${defenderLabel} restores ${meta.heal} HP.`);
  }

  if (meta.debuffImmunity) {
    newState.debuffImmunity[targetPlayerId] = true;
    newState.log.push(`🔐 ${defenderLabel} gains debuff immunity.`);
  }

  return newState;
}

export function utility(
  state: GameActionState,
  card: Card,
  playerId: PlayerId
): GameActionState {
  const newState = cloneState(state);
  const meta = card.meta?.utility ?? {};
  const userLabel = attackerName(playerId);
  const opponentId = playerId === "player" ? "enemy" : "player";
  const opponentLabel = defenderName(opponentId);

  if (meta.attackBuff) {
    newState.nextAttackBuff[playerId] =
      (newState.nextAttackBuff[playerId] ?? 0) + meta.attackBuff;
    newState.log.push(`🧮 ${userLabel} amplifies next attack by +${meta.attackBuff}.`);
  }

  if (meta.defenseBuff) {
    newState.nextAttackReduction[playerId] =
      (newState.nextAttackReduction[playerId] ?? 0) + meta.defenseBuff;
    newState.log.push(`🛡️ ${userLabel} layers defense: -${meta.defenseBuff} damage.`);
  }

  if (meta.enemyWeaken) {
    if (state.debuffImmunity[opponentId]) {
      newState.debuffImmunity[opponentId] = false;
      newState.log.push(`🧼 ${opponentLabel} shrugs off the weaken protocol.`);
    } else {
      newState.nextAttackReduction[opponentId] =
        (newState.nextAttackReduction[opponentId] ?? 0) + meta.enemyWeaken;
      newState.log.push(`📉 ${userLabel} weakens ${opponentLabel}'s next attack by ${meta.enemyWeaken}.`);
    }
  }

  if (meta.heal) {
    if (playerId === "player") {
      newState.playerHp = clampHp(state.playerHp + meta.heal, state.playerMaxHp);
    } else {
      newState.enemyHp = clampHp(state.enemyHp + meta.heal, state.enemyMaxHp);
    }
    newState.log.push(`➕ ${userLabel} restores ${meta.heal} HP.`);
  }

  if (meta.draw) {
    newState.log.push(`🗂️ ${card.name}: buffering ${meta.draw} extra card(s).`);
  }

  return newState;
}

export function main(
  state: GameActionState,
  card: Card,
  playerId: PlayerId
): GameActionState {
  const targetPlayerId = playerId === "player" ? "enemy" : "player";
  
  switch (card.color) {
    case "red":
      return attack(state, card, targetPlayerId);
    case "yellow":
      return defend(state, card, playerId);
    case "green":
      return utility(state, card, playerId);
    default:
      return state;
  }
}

