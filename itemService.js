import { supabase } from "./supabase.js";

export async function getItems() {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addItem(item) {
  const { data, error } = await supabase
    .from("items")
    .insert([item])
    .select()
    .single();

  if (error) throw error;
  return data;
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
