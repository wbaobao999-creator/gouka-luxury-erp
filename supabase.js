import { createClient } from "@supabase/supabase-js";
import { createAuthFetch, ERP_AUTH_STORAGE_KEY } from "./lib/authConnection.js";

const supabaseUrl = "https://duaaijqbngltmlgbzrvt.supabase.co";

const supabaseKey = "sb_publishable_fZXH0KeK6XzxCTUkuR5VEg_XzGhcEG-";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { storageKey: ERP_AUTH_STORAGE_KEY },
  global: { fetch: createAuthFetch(supabaseUrl) }
});
