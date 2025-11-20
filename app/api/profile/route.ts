import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseRouteClient } from "@/lib/supabase/routeClient";

const updateProfileSchema = z.object({
  username: z.string().min(3).max(32).optional(),
  status: z.string().max(64).nullable().optional(),
  bio: z.string().max(280).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  defaultDeckId: z.string().uuid().nullable().optional(),
});

const unauthorized = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET() {
  const supabase = createSupabaseRouteClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return unauthorized;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const supabase = createSupabaseRouteClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return unauthorized;
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { defaultDeckId, avatarUrl, bio, status, username } = parsed.data;

  if (defaultDeckId) {
    const { data: deck } = await supabase
      .from("decks")
      .select("id")
      .eq("id", defaultDeckId)
      .eq("owner_id", session.user.id)
      .maybeSingle();

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof username !== "undefined") updates.username = username;
  if (typeof status !== "undefined") updates.status = status;
  if (typeof bio !== "undefined") updates.bio = bio;
  if (typeof avatarUrl !== "undefined") updates.avatar_url = avatarUrl;
  if (typeof defaultDeckId !== "undefined") updates.default_deck_id = defaultDeckId;

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", session.user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (typeof defaultDeckId !== "undefined") {
    await supabase
      .from("decks")
      .update({ is_default: false })
      .eq("owner_id", session.user.id)
      .neq("id", defaultDeckId ?? "");

    if (defaultDeckId) {
      await supabase.from("decks").update({ is_default: true }).eq("id", defaultDeckId);
    }
  }

  return NextResponse.json(data);
}

