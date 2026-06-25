import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://duaaijqbngltmlgbzrvt.supabase.co";
const supabaseKey =
"这里粘贴真正的Publishable key";

export const supabase = createClient(supabaseUrl, supabaseKey);
