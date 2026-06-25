import { supabase } from "./supabase.js";

const IMAGE_BUCKET = "product-images";

export async function getCloudItems() {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("updated_at", { ascending: false });

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
  const payload = {
    ...item,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("items")
    .upsert([payload], { onConflict: "product_no" })
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

export async function uploadProductImage(productNo, fileOrDataUrl, index = 0) {
  if (!productNo || !fileOrDataUrl) return null;

  const blob = await dataUrlToBlob(fileOrDataUrl);
  const filePath = `${productNo}/${Date.now()}-${index}.jpg`;

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(filePath, blob, {
      contentType: "image/jpeg",
      upsert: true
    });

  if (error) {
    console.error("Image upload failed:", error);
    throw error;
  }

  const { data } = supabase.storage
    .from(IMAGE_BUCKET)
    .getPublicUrl(filePath);

  return data?.publicUrl || null;
}

export async function uploadProductImages(productNo, images = []) {
  const urls = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!img) continue;

    if (typeof img === "string" && img.startsWith("http")) {
      urls.push(img);
      continue;
    }

    const url = await uploadProductImage(productNo, img, i);
    if (url) urls.push(url);
  }

  return urls;
}

export async function deleteProductImages(productNo) {
  if (!productNo) return true;

  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .list(productNo);

  if (error) {
    console.error("List images failed:", error);
    return false;
  }

  const paths = (data || []).map((x) => `${productNo}/${x.name}`);
  if (!paths.length) return true;

  const { error: removeError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .remove(paths);

  if (removeError) {
    console.error("Delete images failed:", removeError);
    return false;
  }

  return true;
}

async function dataUrlToBlob(dataUrl) {
  if (dataUrl instanceof Blob) return dataUrl;

  if (typeof dataUrl !== "string") {
    throw new Error("Invalid image data");
  }

  if (dataUrl.startsWith("http")) {
    const res = await fetch(dataUrl);
    return await res.blob();
  }

  const arr = dataUrl.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}
