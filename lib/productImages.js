const PUBLIC_IMAGES = "/storage/v1/object/public/product-images/";

export function productThumbnailUrl(source) {
  if (typeof source !== "string") return source;
  try {
    const url = new URL(source);
    if (!url.hostname.endsWith(".supabase.co") || !url.pathname.includes(PUBLIC_IMAGES)) return source;
    if (!/\/[^/]+_thumbv1\.(jpg|png|webp|gif)$/i.test(url.pathname)) return source;
    url.pathname = url.pathname.replace(/\.(jpg|png|webp|gif)$/i, ".thumb.jpg");
    return url.href;
  } catch { return source; }
}

export async function createProductThumbnail(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const value = new Image();
      value.onload = () => resolve(value);
      value.onerror = () => reject(new Error("照片解码失败"));
      value.src = url;
    });
    const ratio = Math.min(360 / image.naturalWidth, 360 / image.naturalHeight, 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("浏览器无法生成缩略图");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(value => value ? resolve(value) : reject(new Error("缩略图生成失败")), "image/jpeg", 0.72));
  } finally { URL.revokeObjectURL(url); }
}
