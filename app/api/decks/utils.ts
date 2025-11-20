import { z } from "zod";
import { createSupabaseRouteClient } from "@/lib/supabase/routeClient";

export const sigilValues = ["overload", "override"] as const;
export const archetypeValues = [
  "custom",
  "firewall_guardian",
  "quantum_burst",
  "pulse_vanguard",
  "shadow_infiltrator",
] as const;

export const deckPayloadSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().max(240).nullable().optional(),
  sigil: z.enum(sigilValues).optional(),
  archetype: z.enum(archetypeValues).optional(),
  cards: z.array(z.string()).min(1).max(30),
  isDefault: z.boolean().optional(),
});

export type RouteClient = ReturnType<typeof createSupabaseRouteClient>;

export const sortDeckCards = (cards?: { order_index: number }[]) =>
  (cards ?? []).sort((a, b) => a.order_index - b.order_index);

export async function getSessionUserId(supabase: RouteClient) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user.id ?? null;
}

export async function loadDecks(supabase: RouteClient, ownerId: string) {
  const { data, error } = await supabase
    .from("decks")
    .select(
      `
      *,
      deck_cards (
        id,
        card_id,
        order_index
      )
    `
    )
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((deck) => ({
    ...deck,
    deck_cards: sortDeckCards(deck.deck_cards),
  }));
}

export async function hydrateDeck(supabase: RouteClient, ownerId: string, deckId: string) {
  const decks = await loadDecks(supabase, ownerId);
  return decks.find((deck) => deck.id === deckId) ?? null;
}

export async function syncDefaultDeck(supabase: RouteClient, ownerId: string, deckId: string | null) {
  await supabase.from("decks").update({ is_default: false }).eq("owner_id", ownerId);

  if (deckId) {
    await supabase.from("decks").update({ is_default: true }).eq("id", deckId);
  }

  await supabase
    .from("profiles")
    .update({
      default_deck_id: deckId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ownerId);
}

