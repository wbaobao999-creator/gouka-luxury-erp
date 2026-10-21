// Independent records can save concurrently; one record always saves in order.
export function createRecordWriteQueue() {
  const tails = new Map();
  return (key, write) => {
    const result = (tails.get(key) || Promise.resolve()).catch(() => {}).then(write);
    const tail = result.catch(() => {});
    tails.set(key, tail);
    tail.then(() => { if (tails.get(key) === tail) tails.delete(key); });
    return result;
  };
}
