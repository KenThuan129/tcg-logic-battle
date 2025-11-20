import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/routeClient";
import { DECK_PRESETS } from "@/lib/decks/presets";
import {
  deckPayloadSchema,
  getSessionUserId,
  hydrateDeck,
  loadDecks,
  syncDefaultDeck,
} from "./utils";

const unauthorized = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET() {
  const supabase = createSupabaseRouteClient();
  const ownerId = await getSessionUserId(supabase);

  if (!ownerId) {
    return unauthorized;
  }

  try {
    let decks = await loadDecks(supabase, ownerId);

    if (!decks.length) {
      const preset = DECK_PRESETS[0];
      const { data: deck, error } = await supabase
        .from("decks")
        .insert({
          owner_id: ownerId,
          name: preset.name,
          description: preset.description,
          archetype: preset.archetype,
          sigil: preset.sigil,
          is_default: true,
        })
        .select("*")
        .single();

      if (error || !deck) {
        throw new Error(error?.message ?? "Unable to seed deck");
      }

      if (preset.cards.length) {
        await supabase.from("deck_cards").insert(
          preset.cards.map((cardId, index) => ({
            deck_id: deck.id,
            card_id: cardId,
            order_index: index + 1,
          }))
        );
      }

      await syncDefaultDeck(supabase, ownerId, deck.id);
      decks = await loadDecks(supabase, ownerId);
    }

    return NextResponse.json(decks);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = createSupabaseRouteClient();
  const ownerId = await getSessionUserId(supabase);

  if (!ownerId) {
    return unauthorized;
  }

  const payload = await request.json().catch(() => null);
  const parsed = deckPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { archetype = "custom", cards, description, isDefault = false, name, sigil = "overload" } = parsed.data;

  const uniqueCards = Array.from(new Set(cards));
  if (uniqueCards.length !== cards.length) {
    return NextResponse.json({ error: "Duplicate cards are not allowed in a deck." }, { status: 400 });
  }

  const { data: deck, error } = await supabase
    .from("decks")
    .insert({
      owner_id: ownerId,
      name,
      description: description ?? null,
      archetype,
      sigil,
      is_default: isDefault,
    })
    .select("*")
    .single();

  if (error || !deck) {
    return NextResponse.json({ error: error?.message ?? "Unable to create deck" }, { status: 500 });
  }

  if (uniqueCards.length > 0) {
    const cardPayload = uniqueCards.map((cardId, index) => ({
      deck_id: deck.id,
      card_id: cardId,
      order_index: index + 1,
    }));

    const { error: cardError } = await supabase.from("deck_cards").insert(cardPayload);
    if (cardError) {
      return NextResponse.json({ error: cardError.message }, { status: 500 });
    }
  }

  if (isDefault) {
    await syncDefaultDeck(supabase, ownerId, deck.id);
  }

  const hydrated = await hydrateDeck(supabase, ownerId, deck.id);
  return NextResponse.json(hydrated);
}

