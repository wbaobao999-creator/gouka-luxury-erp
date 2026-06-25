import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://duaaijqbngltmlgbzrvt.supabase.co";

const supabaseKey = "你的真实 Publishable key";

export const supabase = createClient(supabaseUrl, supabaseKey);
