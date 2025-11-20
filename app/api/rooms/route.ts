import { supabaseAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabaseAdminClient
    .from("rooms")
    .select(
      `
      id,
      name,
      status,
      is_public,
      room_players!left ( id )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const payload =
    data?.map((room) => ({
      id: room.id,
      name: room.name,
      status: room.status,
      is_public: room.is_public,
      player_count: room.room_players?.length ?? 0,
    })) ?? [];

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: "Room name required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdminClient
    .from("rooms")
    .insert({
      name: body.name,
      is_public: true,
      status: "waiting",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

