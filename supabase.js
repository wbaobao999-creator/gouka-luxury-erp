import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://duaaijqbngltmlgbzrvt.supabase.co";
 const supabaseKey = "sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

export const supabase = createClient(supabaseUrl, supabaseKey);
