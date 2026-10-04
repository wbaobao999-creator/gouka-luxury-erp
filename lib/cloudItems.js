export async function readAllCloudItems(client, pageSize = 500) {
  const rows = [];
  const seen = new Set();
  let cursor = null;
  let expectedCount = null;
  for (;;) {
    let query = client.from("items").select("*", { count: "exact" })
      .order("product_no", { ascending: true }).limit(pageSize);
    if (cursor !== null) query = query.gt("product_no", cursor);
    const { data, error, count } = await query;
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("云端商品读取失败，请重试。");
    if (cursor === null && typeof count === "number") expectedCount = count;
    if (!data.length) {
      if (expectedCount !== null && rows.length !== expectedCount) {
        throw new Error("读取期间云端商品发生变化，请重新读取。原有本地商品已保留。");
      }
      return rows;
    }
    for (const row of data) {
      if (typeof row.product_no !== "string" || !row.product_no ||
          seen.has(row.product_no)) {
        throw new Error("云端商品编号异常，已停止读取并保留本地数据。");
      }
      seen.add(row.product_no);
      rows.push(row);
      cursor = row.product_no;
    }
  }
}

export function sharedCloudReader(client) {
  let pending = null;
  return function read() {
    if (!pending) pending = readAllCloudItems(client).finally(() => { pending = null; });
    return pending;
  };
}
