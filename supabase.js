import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://duaaijqbngltmlgbzrvt.supabase.co";
const supabaseKey = "这里粘贴你的 Publishable key，不要用 Secret key";

export const supabase = createClient(supabaseUrl, supabaseKey);
