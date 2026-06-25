import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://duaaijqbngltmlgbzrvt.supabase.co";

const supabaseKey = "YOUR_PUBLISHABLE_KEY";

export const supabase = createClient(supabaseUrl, supabaseKey);
