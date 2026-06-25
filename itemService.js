import { supabase } from "./supabase.js";

const IMAGE_BUCKET = "product-images";

function isHttpUrl(value) {
  return typeof value === "string" && value.startsWith("http");
}

function isDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function safeFileExt(dataUrl) {
  const m = String(dataUrl || "").match(/^data:image\/([a-zA-Z0-9+.-]+);base64,/);
  const ext = (m?.[1] || "jpg").toLowerCase().replace("jpeg", "jpg");
  return ["jpg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
}

function dataUrlToBlob(dataUrl) {
  const parts = String(dataUrl || "").split(",");
  if (parts.length < 2) throw new Error("Invalid image data");

  const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bin = atob(parts[1]);
  const len = bin.length;
  const arr = new Uint8Array(len);

  for (let i = 0; i < len; i += 1) {
    arr[i] = bin.charCodeAt(i);
  }

  return new Blob([arr], { type: mime });
}

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

export async function updateItem(productNo, item) {
  return upsertCloudItem({
    ...item,
    product_no: item.product_no || productNo
  });
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

export async function uploadItemImages(productNo, images = []) {
  const result = [];
  const list = Array.isArray(images) ? images.slice(0, 3) : [];

  for (let i = 0; i < list.length; i += 1) {
    const img = list[i];
    if (!img) continue;

    if (isHttpUrl(img)) {
      result.push(img);
      continue;
    }

    if (!isDataUrl(img)) {
      continue;
    }

    try {
      const ext = safeFileExt(img);
      const blob = dataUrlToBlob(img);
      const safeNo = String(productNo || "item").replace(/[^a-zA-Z0-9_-]/g, "_");
      const path = `${safeNo}/${Date.now()}_${i}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(path, blob, {
          cacheControl: "3600",
          upsert: true,
          contentType: blob.type || "image/jpeg"
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(IMAGE_BUCKET)
        .getPublicUrl(path);

      if (data?.publicUrl) {
        result.push(data.publicUrl);
      }
    } catch (e) {
      console.error("Image upload failed:", e);
    }
  }

  return result;
}

export async function deleteItemImagesCloud(productNo) {
  if (!productNo) return true;

  const safeNo = String(productNo || "item").replace(/[^a-zA-Z0-9_-]/g, "_");

  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .list(safeNo);

  if (error) {
    console.error("List cloud images failed:", error);
    return false;
  }

  const paths = (data || []).map((x) => `${safeNo}/${x.name}`);
  if (!paths.length) return true;

  const { error: removeError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .remove(paths);

  if (removeError) {
    console.error("Delete cloud images failed:", removeError);
    return false;
  }

  return true;
}
