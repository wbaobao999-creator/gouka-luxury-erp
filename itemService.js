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
  if (parts.length < 2) throw new Error("Invalid image");

  const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bin = atob(parts[1]);
  const len = bin.length;
  const arr = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    arr[i] = bin.charCodeAt(i);
  }

  return new Blob([arr], { type: mime });
}

function shouldRetryWithoutEnterpriseColumns(error) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return msg.includes("auction_json") || msg.includes("schema cache") || msg.includes("column") || msg.includes("could not find");
}

function stripEnterpriseColumns(item) {
  const next = { ...item };
  delete next.auction_json;
  delete next.auction;
  return next;
}

/* ===========================
   商品
=========================== */

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
  const payload = {
    ...item,
    updated_at: new Date().toISOString()
  };

  const request = (row) => supabase
    .from("items")
    .upsert([row], { onConflict: "product_no" })
    .select()
    .single();

  let { data, error } = await request(payload);

  if (error && shouldRetryWithoutEnterpriseColumns(error)) {
    console.warn("Supabase items table has no auction_json column yet. Retrying without enterprise-only columns.", error);
    const retry = await request(stripEnterpriseColumns(payload));
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;

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

  if (error) throw error;

  return true;
}

/* ===========================
   图片上传
=========================== */

export async function uploadItemImages(productNo, images = []) {
  const result = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];

    if (!img) continue;

    if (isHttpUrl(img)) {
      result.push(img);
      continue;
    }

    if (!isDataUrl(img)) continue;

    try {
      const ext = safeFileExt(img);
      const blob = dataUrlToBlob(img);
      const safeProductNo = String(productNo).replace(/[^a-zA-Z0-9_-]/g, "_");
      const imagePath = safeProductNo + "/" + Date.now() + "_" + i + "." + ext;

      const { error } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(imagePath, blob, {
          cacheControl: "3600",
          upsert: true
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from(IMAGE_BUCKET)
        .getPublicUrl(imagePath);

      if (data?.publicUrl) result.push(data.publicUrl);
    } catch (e) {
      console.error(e);
    }
  }

  return result;
}

/* ===========================
   删除图片
=========================== */

export async function deleteItemImagesCloud(productNo) {
  const folder = String(productNo).replace(/[^a-zA-Z0-9_-]/g, "_");

  const { data } = await supabase.storage
    .from(IMAGE_BUCKET)
    .list(folder);

  if (!data?.length) return true;

  const paths = data.map((x) => folder + "/" + x.name);

  await supabase.storage
    .from(IMAGE_BUCKET)
    .remove(paths);

  return true;
}

/* ===========================
   兼容旧版本
=========================== */

export async function deleteProductImages(productNo) {
  return deleteItemImagesCloud(productNo);
}
