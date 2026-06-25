import { supabase } from "./supabase.js";

export async function getCloudItems() {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Load cloud items failed:", error);
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

  if (error) {
    console.error("Cloud save failed:", error);
    throw error;
  }

  return data;
}

export async function addItem(item) {
  return upsertCloudItem(item);
}

export async function updateItem(id, item) {
  return upsertCloudItem(item);
}

export async function deleteItemCloud(productNo) {
  const { error } = await supabase
    .from("items")
    .delete()
    .eq("product_no", productNo);

  if (error) {
    console.error("Cloud delete failed:", error);
    throw error;
  }

  return true;
}
