const MAX_BYTES = 100 * 1024 * 1024;

async function fingerprint(blob) {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return { sha256: [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join(""),
    bytes: blob.size, type: blob.type };
}

function embeddedBlob(value, maxBytes = MAX_BYTES) {
  if (typeof value !== "string") throw new Error("完整备份缺少文件原件");
  const match = /^data:([^;,]*);base64,([A-Za-z0-9+/]*={0,2})$/.exec(value);
  if (!match || !match[2] || match[2].length % 4) throw new Error("备份文件编码损坏");
  if (match[2].length > 4 * Math.ceil(maxBytes / 3)) throw new Error("完整备份超过文件容量限制");
  const raw = atob(match[2]);
  return new Blob([Uint8Array.from(raw, char => char.charCodeAt(0))], { type: match[1] });
}

// Only file-bearing fields are visited; human notes and ordinary URLs are untouched.
async function visitFiles(value, transform) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) { for (const child of value) await visitFiles(child, transform); return; }
  for (const key of ["images", "cloud_images"]) {
    if (Array.isArray(value[key])) {
      for (let i = 0; i < value[key].length; i++) value[key][i] = await transform(value[key][i]);
    }
  }
  if (Array.isArray(value.attachments)) {
    for (let i = 0; i < value.attachments.length; i++) {
      if (typeof value.attachments[i] === "string") value.attachments[i] = { url: value.attachments[i], name: "attachment" };
      const attachment = value.attachments[i];
      if (!attachment || typeof attachment !== "object") throw new Error("附件记录无效");
      attachment.dataUrl = await transform(attachment.dataUrl || attachment.url, attachment);
    }
  }
  for (const [key, child] of Object.entries(value)) {
    if (!["images", "cloud_images", "attachments", "fileBackup"].includes(key)) await visitFiles(child, transform);
  }
}

export async function validatePortableBackup(data, { maxBytes = MAX_BYTES } = {}) {
  if (!data?.fileBackup?.complete) return { verified: false, legacy: true };
  const metadata = data.fileBackup;
  if (![1, 2].includes(metadata.version)) throw new Error("不支持的完整备份版本");
  const expected = new Map();
  if (metadata.version === 2) {
    if (!Array.isArray(metadata.manifest)) throw new Error("完整备份缺少文件校验清单");
    for (const file of metadata.manifest) {
      if (!/^[a-f0-9]{64}$/.test(file?.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes <= 0 || expected.has(file.sha256)) throw new Error("备份校验清单无效");
      expected.set(file.sha256, file);
    }
  }
  const seen = new Map(), cache = new Set();
  let totalBytes = 0;
  await visitFiles(data, async value => {
    if (cache.has(value)) return value;
    const blob = embeddedBlob(value, maxBytes);
    const actual = await fingerprint(blob);
    cache.add(value);
    if (!seen.has(actual.sha256)) {
      totalBytes += actual.bytes;
      if (totalBytes > maxBytes) throw new Error("完整备份超过文件容量限制");
      seen.set(actual.sha256, actual);
    }
    if (metadata.version === 2) {
      const entry = expected.get(actual.sha256);
      if (!entry || entry.bytes !== actual.bytes || entry.type !== actual.type) throw new Error("备份照片或附件校验失败，未开始恢复");
    }
    return value;
  });
  if (metadata.version === 2 && (expected.size !== seen.size || metadata.files !== seen.size || metadata.totalBytes !== totalBytes)) throw new Error("完整备份缺少文件或清单不一致，未开始恢复");
  return { verified: metadata.version === 2, legacy: metadata.version === 1, files: seen.size, totalBytes };
}

export async function buildPortableBackup(data, { loadBlob, toDataUrl, maxBytes = MAX_BYTES, onProgress = () => {} }) {
  const result = JSON.parse(JSON.stringify(data));
  const cache = new Map();
  const manifest = new Map();
  let totalBytes = 0;
  let files = 0;
  async function embed(value, attachment) {
    const url = value || (attachment?.path ? "storage:" + (attachment.bucket || "import-batch-files") + "/" + attachment.path : "");
    if (cache.has(url)) return cache.get(url);
    if (typeof url !== "string" || !/^(https?:|data:|storage:)/.test(url)) throw new Error("备份包含无法读取的文件地址");
    const blob = await loadBlob(url, attachment);
    if (!(blob instanceof Blob) || !blob.size) throw new Error("备份文件为空或读取失败");
    if (blob.size > maxBytes) throw new Error("完整备份超过文件容量限制");
    const info = await fingerprint(blob);
    if (!manifest.has(info.sha256)) {
      totalBytes += blob.size;
      manifest.set(info.sha256, info);
    }
    if (totalBytes > maxBytes) throw new Error("完整文件备份超过100MB，请按月份分批备份；本次未生成不完整备份。");
    const encoded = await toDataUrl(blob);
    const encodedInfo = await fingerprint(embeddedBlob(encoded));
    if (encodedInfo.sha256 !== info.sha256 || encodedInfo.type !== info.type) throw new Error("文件编码校验失败");
    cache.set(url, encoded);
    onProgress(++files, totalBytes);
    return encoded;
  }
  await visitFiles(result, embed);
  result.fileBackup = { version: 2, complete: true, files: manifest.size, totalBytes, manifest: [...manifest.values()] };
  await validatePortableBackup(result, { maxBytes });
  return result;
}
