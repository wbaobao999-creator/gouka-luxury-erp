import { supabase } from "./supabase.js";

export async function getCloudItems() {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function upsertCloudItem(item) {
  const { data, error } = await supabase
    .from("items")
    .upsert([item], { onConflict: "product_no" })
    .select()
    .single();

  if (error) throw error;
  return data;
}
