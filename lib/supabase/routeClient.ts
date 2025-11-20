import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const createSupabaseRouteClient = (): SupabaseClient<Database> => {
  return createRouteHandlerClient<Database>({ cookies });
};

