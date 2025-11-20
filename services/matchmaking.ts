"use client";

type RoomResponse = {
  id: string;
  name: string;
  status: string;
  is_public: boolean;
  player_count: number;
};

export async function listRooms(): Promise<RoomResponse[]> {
  const res = await fetch("/api/rooms", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Unable to fetch rooms");
  }
  return res.json();
}

export async function createRoom(name: string) {
  const res = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Unable to create room");
  }

  return res.json();
}

