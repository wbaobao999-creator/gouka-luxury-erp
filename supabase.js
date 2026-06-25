import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://duaaijqbngltmlgbzrvt.supabase.co";

const supabaseKey = "sb_publishable_fZXH0KeK6XzxCTUkuR5VEg_XzGhcEG-";

export const supabase = createClient(supabaseUrl, supabaseKey);
