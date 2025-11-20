"use client";

import { useSessionContext } from "@supabase/auth-helpers-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export const useSupabase = (): SupabaseClient<Database> => {
  const context = useSessionContext();

  if (!context.supabaseClient) {
    throw new Error("Supabase client is not available");
  }

  return context.supabaseClient;
};

