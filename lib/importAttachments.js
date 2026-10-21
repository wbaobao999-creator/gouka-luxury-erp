import { createErpAuth } from "./erpAuth.js";

const HOST = "duaaijqbngltmlgbzrvt.supabase.co";
export function importAttachmentPath(value) {
  const attachment = typeof value === "string" ? { url: value } : value || {};
  let path = attachment.path;
  if (attachment.bucket && attachment.bucket !== "import-batch-files") throw new Error("附件存储位置无效");
  if (!path && attachment.url) {
    const url = new URL(attachment.url);
    if (url.protocol !== "https:" || url.hostname !== HOST) return null;
    const match = /^\/storage\/v1\/object\/(?:public|sign|authenticated)\/import-batch-files\/(.+)$/.exec(url.pathname);
    if (!match) throw new Error("附件存储位置无效");
    path = decodeURIComponent(match[1]);
  }
  if (!path) return null;
  if (typeof path !== "string" || path.startsWith("/") || path.includes("\\") || /[\u0000-\u001f]/.test(path) || path.split("/").some(part => !part || part === "." || part === "..")) throw new Error("附件路径无效");
  return path;
}

export function createImportAttachmentReader(client) {
  const auth = createErpAuth(client);
  return async function readAttachment(value) {
    const attachment = typeof value === "string" ? { url: value } : value || {};
    if (attachment.dataUrl?.startsWith("data:")) {
      const response = await fetch(attachment.dataUrl);
      return response.blob();
    }
    if (!await auth.verifiedSession()) throw new Error("请重新登录后读取附件");
    const path = importAttachmentPath(attachment);
    if (path) {
      const { data, error } = await client.storage.from("import-batch-files").download(path);
      if (error || !(data instanceof Blob) || !data.size) throw new Error("附件读取失败，请检查权限或稍后重试");
      return data;
    }
    const url = new URL(attachment.url);
    if (url.protocol !== "https:") throw new Error("附件地址无效");
    const response = await fetch(url);
    if (!response.ok) throw new Error("附件下载失败");
    return response.blob();
  };
}
