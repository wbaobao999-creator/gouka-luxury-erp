import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://duaaijqbngltmlgbzrvt.supabase.co";

// 这里换成你自己的 Publishable key（不要用 Secret key）
const supabaseKey = "在这里粘贴你的真实 Publishable key";

export const supabase = createClient(supabaseUrl, supabaseKey);
