import type { DeckArchetype, SigilType } from "@/lib/supabase/types";

export type DeckPreset = {
  id: string;
  name: string;
  description: string;
  archetype: DeckArchetype;
  sigil: SigilType;
  cards: string[];
};

const sharedControlCards = ["y1", "y2", "y3", "y4", "y5", "y6", "y7", "y8", "y9"];
const sharedUtilityCards = ["g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8", "g9"];

export const DECK_PRESETS: DeckPreset[] = [
  {
    id: "firewall_guardian",
    name: "Firewall Guardian",
    description: "Turtle up, punish misplays, and outlast with counter-bursts.",
    archetype: "firewall_guardian",
    sigil: "override",
    cards: [...sharedControlCards, "r3", "r4", "r5", "r8", ...sharedUtilityCards.slice(0, 6)],
  },
  {
    id: "quantum_burst",
    name: "Quantum Burst",
    description: "All-in attacker focused on Overload chains and burn procs.",
    archetype: "quantum_burst",
    sigil: "overload",
    cards: ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", ...sharedUtilityCards, "y1", "y2", "y4", "y5"],
  },
  {
    id: "pulse_vanguard",
    name: "Pulse Vanguard",
    description: "Balanced frontline with tempo boosts and proactive shields.",
    archetype: "pulse_vanguard",
    sigil: "override",
    cards: ["r1", "r2", "r4", "r6", "r8", "y1", "y2", "y3", "y5", "y6", "y7", "y8", "g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8"],
  },
  {
    id: "shadow_infiltrator",
    name: "Shadow Infiltrator",
    description: "Status manipulation with sneaky burn and disabling tech.",
    archetype: "shadow_infiltrator",
    sigil: "overload",
    cards: ["r3", "r5", "r8", "y2", "y3", "y4", "y8", "g1", "g3", "g4", "g7", "g8", "g9"],
  },
];

