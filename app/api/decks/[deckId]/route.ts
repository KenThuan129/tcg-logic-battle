import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseRouteClient } from "@/lib/supabase/routeClient";
import {
  deckPayloadSchema,
  getSessionUserId,
  hydrateDeck,
  loadDecks,
  syncDefaultDeck,
} from "../utils";

const idParamSchema = z.object({ params: z.object({ deckId: z.string().uuid() }) });
const unauthorized = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET(_: Request, context: { params: { deckId: string } }) {
  const supabase = createSupabaseRouteClient();
  const ownerId = await getSessionUserId(supabase);

  if (!ownerId) {
    return unauthorized;
  }

  const parsed = idParamSchema.safeParse(context);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid deck id" }, { status: 400 });
  }

  const { deckId } = parsed.data.params;

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
    .eq("id", deckId)
    .eq("owner_id", ownerId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({
    ...data,
    deck_cards: data.deck_cards?.sort((a, b) => a.order_index - b.order_index) ?? [],
  });
}

export async function PUT(request: Request, context: { params: { deckId: string } }) {
  const supabase = createSupabaseRouteClient();
  const ownerId = await getSessionUserId(supabase);

  if (!ownerId) {
    return unauthorized;
  }

  const parsedParams = idParamSchema.safeParse(context);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid deck id" }, { status: 400 });
  }

  const { deckId } = parsedParams.data.params;
  const payload = await request.json().catch(() => null);
  const parsedPayload = deckPayloadSchema.partial().safeParse(payload);

  if (!parsedPayload.success) {
    return NextResponse.json({ error: parsedPayload.error.flatten() }, { status: 400 });
  }

  const updates = parsedPayload.data;

  if (updates.cards && new Set(updates.cards).size !== updates.cards.length) {
    return NextResponse.json({ error: "Duplicate cards are not allowed in a deck." }, { status: 400 });
  }

  const { error: guardError } = await supabase
    .from("decks")
    .select("id")
    .eq("id", deckId)
    .eq("owner_id", ownerId)
    .single();

  if (guardError) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("decks")
    .update({
      name: updates.name,
      description: updates.description ?? null,
      sigil: updates.sigil,
      archetype: updates.archetype,
      updated_at: new Date().toISOString(),
    })
    .eq("id", deckId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (updates.cards) {
    await supabase.from("deck_cards").delete().eq("deck_id", deckId);

    const cardPayload = updates.cards.map((cardId, index) => ({
      deck_id: deckId,
      card_id: cardId,
      order_index: index + 1,
    }));

    const { error: cardError } = await supabase.from("deck_cards").insert(cardPayload);
    if (cardError) {
      return NextResponse.json({ error: cardError.message }, { status: 500 });
    }
  }

  if (typeof updates.isDefault === "boolean") {
    await syncDefaultDeck(supabase, ownerId, updates.isDefault ? deckId : null);
  }

  const hydrated = await hydrateDeck(supabase, ownerId, deckId);
  return NextResponse.json(hydrated);
}

export async function DELETE(_: Request, context: { params: { deckId: string } }) {
  const supabase = createSupabaseRouteClient();
  const ownerId = await getSessionUserId(supabase);

  if (!ownerId) {
    return unauthorized;
  }

  const parsed = idParamSchema.safeParse(context);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid deck id" }, { status: 400 });
  }

  const { deckId } = parsed.data.params;

  const decks = await loadDecks(supabase, ownerId);
  if (decks.length <= 1) {
    return NextResponse.json({ error: "At least one deck must remain." }, { status: 400 });
  }

  const targetDeck = decks.find((deck) => deck.id === deckId);
  if (!targetDeck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  const { error } = await supabase.from("decks").delete().eq("id", deckId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (targetDeck.is_default) {
    const fallbackDeck = decks.find((deck) => deck.id !== deckId);
    await syncDefaultDeck(supabase, ownerId, fallbackDeck?.id ?? null);
  }

  return NextResponse.json({ success: true });
}

