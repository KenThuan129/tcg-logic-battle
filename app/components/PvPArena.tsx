"use client";

import { useEffect, useState } from "react";
import { Loader2, Swords, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listRooms, createRoom } from "@/services/matchmaking";

type Room = {
  id: string;
  name: string;
  status: string;
  is_public: boolean;
  player_count: number;
};

export function PvPArena() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listRooms();
      setRooms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!roomName) return;
    setCreating(true);
    setError(null);
    try {
      await createRoom(roomName);
      setRoomName("");
      await fetchRooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create room");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <div className="relative z-10 px-6 pb-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl space-y-6">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-500/20 text-emerald-300 p-3">
                <Swords className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-white/60">PvP Arena</p>
                <h2 className="text-xl font-semibold text-white">Real-time duel rooms</h2>
              </div>
            </div>
            <Button
              variant="ghost"
              className="text-white/70"
              onClick={fetchRooms}
              disabled={loading}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh Rooms
            </Button>
          </header>

          <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Room name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
            <Button type="submit" disabled={creating || !roomName}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Host a Room"
              )}
            </Button>
          </form>

          {error && <p className="text-sm text-rose-400">{error}</p>}
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-2xl">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-white/60">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Fetching active rooms…
            </div>
          ) : rooms.length === 0 ? (
            <div className="py-12 text-center text-white/60">
              No rooms are active. Host one or refresh to search again.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
                    <span>{room.is_public ? "Public" : "Private"}</span>
                    <span>{room.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-white">
                    <div>
                      <p className="font-semibold text-lg">{room.name}</p>
                      <p className="text-xs text-white/60">
                        {room.player_count}/2 combatants synced
                      </p>
                    </div>
                    <Button variant="outline" className="text-xs uppercase tracking-[0.4em]">
                      Join
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

