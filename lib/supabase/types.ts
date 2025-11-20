import type { GameSnapshot } from "@/store/gameStore";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          status: string | null;
          bio: string | null;
          default_deck_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          avatar_url?: string | null;
          status?: string | null;
          bio?: string | null;
          default_deck_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          avatar_url?: string | null;
          status?: string | null;
          bio?: string | null;
          default_deck_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cards: {
        Row: {
          id: string;
          name: string;
          description: string;
          color: string;
          type: string;
          mana_cost: number;
          value: number;
          meta: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description: string;
          color: string;
          type: string;
          mana_cost: number;
          value: number;
          meta?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          color?: string;
          type?: string;
          mana_cost?: number;
          value?: number;
          meta?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          title: string | null;
          status: MatchStatus;
          is_public: boolean;
          host_id: string;
          guest_id: string | null;
          created_at: string;
          updated_at: string;
          last_action_at: string | null;
          state: GameSnapshot | null;
        };
        Insert: {
          id?: string;
          title?: string | null;
          status?: MatchStatus;
          is_public?: boolean;
          host_id: string;
          guest_id?: string | null;
          created_at?: string;
          updated_at?: string;
          last_action_at?: string | null;
          state?: GameSnapshot | null;
        };
        Update: {
          id?: string;
          title?: string | null;
          status?: MatchStatus;
          is_public?: boolean;
          host_id?: string;
          guest_id?: string | null;
          created_at?: string;
          updated_at?: string;
          last_action_at?: string | null;
          state?: GameSnapshot | null;
        };
      };
      decks: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          archetype: DeckArchetype;
          sigil: SigilType;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          archetype?: DeckArchetype;
          sigil?: SigilType;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          description?: string | null;
          archetype?: DeckArchetype;
          sigil?: SigilType;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      deck_cards: {
        Row: {
          id: string;
          deck_id: string;
          card_id: string;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          deck_id: string;
          card_id: string;
          order_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          deck_id?: string;
          card_id?: string;
          order_index?: number;
          created_at?: string;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: {
      match_status: MatchStatus;
      deck_archetype: DeckArchetype;
      sigil_type: SigilType;
    };
  };
}

export type MatchStatus = "waiting" | "active" | "finished" | "abandoned";
export type DeckArchetype =
  | "custom"
  | "firewall_guardian"
  | "quantum_burst"
  | "pulse_vanguard"
  | "shadow_infiltrator";
export type SigilType = "overload" | "override";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type DeckRow = Database["public"]["Tables"]["decks"]["Row"];
export type DeckCardRow = Database["public"]["Tables"]["deck_cards"]["Row"];

export type MatchRow = Database["public"]["Tables"]["matches"]["Row"] & {
  host?: ProfileRow | null;
  guest?: ProfileRow | null;
};

