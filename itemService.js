import { supabase } from "./supabase.js";

export async function getCloudItems() {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

export async function getItems() {
  return getCloudItems();
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

export async function addItem(item) {
  return upsertCloudItem(item);
}

export async function updateItem(id, item) {
  const { data, error } = await supabase
    .from("items")
    .update(item)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteItemCloud(id) {
  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
