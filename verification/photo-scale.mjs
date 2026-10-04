import assert from "node:assert/strict";
import { readAllCloudItems, sharedCloudReader } from "../lib/cloudItems.js";
import { productThumbnailUrl } from "../lib/productImages.js";
import { uploadProductImages } from "../lib/imageUpload.js";

const source = Array.from({ length: 10000 }, (_, i) => ({
  product_no: "CN-202609-" + String(i).padStart(5, "0"),
  cloud_images: [0, 1, 2].map(n => "https://example.com/" + i + "/" + n + ".jpg")
}));
source.push({ product_no: "__GOUKA_ERP_GLOBAL_STATE__", cloud_images: [] });
source.sort((a, b) => a.product_no.localeCompare(b.product_no));
function clientFor(rows, { cap = 100, failAt = -1, countDelta = 0, repeat = false } = {}) {
  let calls = 0;
  return {
    get calls() { return calls; },
    from(table) {
      assert.equal(table, "items");
      let cursor = null, limit = 500;
      return {
        select() { return this; }, order(key, options) { assert.equal(key, "product_no"); assert(options.ascending); return this; },
        limit(n) { limit = n; return this; }, gt(key, value) { assert.equal(key, "product_no"); cursor = value; return this; },
        then(resolve, reject) {
          const number = calls++;
          const filtered = rows.filter(r => cursor === null || r.product_no > cursor);
          const data = repeat && cursor !== null ? rows.slice(0, 1) : filtered.slice(0, Math.min(cap, limit));
          return Promise.resolve({ data, count: rows.length + countDelta,
            error: number === failAt ? new Error("network failed") : null }).then(resolve, reject);
        }
      };
    }
  };
}
// ASCII ordering is the mock server's collation; production uses PostgreSQL for both ordering and cursor filtering.
source.sort((a, b) => a.product_no < b.product_no ? -1 : 1);
for (const cap of [100, 500, 1000]) {
  const client = clientFor(source, { cap });
  assert.deepEqual(await readAllCloudItems(client), source);
  console.log("CLOUD_SCALE_PASS", source.length, "products / 30000 image URLs", "server cap", cap, "requests", client.calls);
}
assert.deepEqual(await readAllCloudItems(clientFor([])), []);
await assert.rejects(readAllCloudItems(clientFor(source, { failAt: 2 })), /network failed/);
await assert.rejects(readAllCloudItems(clientFor(source, { countDelta: 1 })), /发生变化/);
await assert.rejects(readAllCloudItems(clientFor(source, { repeat: true })), /编号异常/);
await assert.rejects(readAllCloudItems(clientFor([{ product_no: null }])), /编号异常/);
const readerClient = clientFor(source), read = sharedCloudReader(readerClient);
const first = read(), second = read();
assert.equal(first, second, "simultaneous callers share one read");
await first;
const calls = readerClient.calls; await read();
assert(readerClient.calls > calls, "later reads are fresh");
const failingRead = sharedCloudReader(clientFor(source, { failAt: 0 }));
await assert.rejects(failingRead(), /network failed/);
assert.deepEqual(await failingRead(), source, "failed reader resets for retry");

const url = "https://duaaijqbngltmlgbzrvt.supabase.co/storage/v1/object/public/product-images/CN/photo_thumbv1.png";
assert.equal(productThumbnailUrl(url), url.replace(".png", ".thumb.jpg"));
for (const legacy of ["data:image/png;base64,AA==", "https://example.com/photo_thumbv1.jpg", url.replace("_thumbv1", ""), ""]) {
  assert.equal(productThumbnailUrl(legacy), legacy, "legacy and external photos unchanged");
}
const image = "data:image/png;base64,AA==", existing = "https://example.com/existing.jpg";
const uploaded = [];
const storage = {
  async upload(path, blob, options) { uploaded.push({ path, blob, options }); return { error: null }; },
  getPublicUrl(path) { return { data: { publicUrl: "https://example.com/" + path } }; }
};
const result = await uploadProductImages(storage, "CN-TEST", [existing, image, image], async () => new Blob(["thumb"], { type: "image/jpeg" }));
assert.equal(result.length, 3); assert.equal(result[0], existing);
assert.equal(uploaded.length, 4);
assert(uploaded.every(x => !x.options.upsert));
assert.equal(uploaded[1].blob.size, 1, "original photo bytes unchanged");
const partialStorage = {
  ...storage,
  async upload(path) { return { error: path.endsWith(".thumb.jpg") ? null : new Error("original upload failed") }; }
};
await assert.rejects(
  uploadProductImages(partialStorage, "CN-TEST", [existing, image, image], async () => new Blob(["thumb"])),
  error => { assert.deepEqual(error.images, [existing, image, image]); return /第 2 张/.test(error.message); }
);
let originals = 0;
const secondFailure = {
  ...storage,
  async upload(path) { return { error: path.endsWith(".thumb.jpg") || originals++ === 0 ? null : new Error("fail second") }; }
};
await assert.rejects(
  uploadProductImages(secondFailure, "CN-TEST", [image, image], async () => new Blob(["thumb"])),
  error => { assert(error.images[0].startsWith("https://")); assert.equal(error.images[1], image); return true; }
);
const originalOnly = await uploadProductImages(storage, "CN-TEST", [image], async () => { throw new Error("thumbnail unavailable"); });
assert(!originalOnly[0].includes("_thumbv1"), "thumbnail failure preserves usable original URL");
await assert.rejects(uploadProductImages(storage, "CN-TEST", ["bad-image"]), /上传失败/);
console.log("PHOTO_UPLOAD_SAFETY_PASS");
