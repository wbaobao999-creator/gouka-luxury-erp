import { createProductThumbnail } from "./productImages.js";

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


export async function uploadProductImages(storage, productNo, images = [], makeThumbnail = createProductThumbnail) {
  const result = [];
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    if (!image) continue;
    if (isHttpUrl(image)) { result.push(image); continue; }
    try {
      if (!isDataUrl(image)) throw new Error("照片格式无效");
      const blob = dataUrlToBlob(image);
      const folder = String(productNo).replace(/[^a-zA-Z0-9_-]/g, "_");
      const token = globalThis.crypto?.randomUUID?.() || Date.now() + "_" + Math.random().toString(36).slice(2);
      const root = folder + "/" + token;
      let thumbnailReady = false;
      try {
        const thumbnail = await makeThumbnail(blob);
        const { error } = await storage.upload(root + "_thumbv1.thumb.jpg", thumbnail, {
          cacheControl: "31536000", upsert: false, contentType: "image/jpeg"
        });
        if (error) throw error;
        thumbnailReady = true;
      } catch (error) {
        // A thumbnail failure must never discard the original photo.
        console.warn("缩略图未生成，保留原图显示", error);
      }
      const path = root + (thumbnailReady ? "_thumbv1" : "") + "." + safeFileExt(image);
      const { error } = await storage.upload(path, blob, {
        cacheControl: "31536000", upsert: false, contentType: blob.type
      });
      if (error) throw error;
      const { data } = storage.getPublicUrl(path);
      if (!data?.publicUrl) throw new Error("无法取得照片地址");
      result.push(data.publicUrl);
    } catch (cause) {
      const error = new Error("第 " + (i + 1) + " 张照片上传失败，商品尚未保存。请重试。");
      error.cause = cause;
      error.images = [...result, ...images.slice(i)];
      throw error;
    }
  }
  return result;
}
