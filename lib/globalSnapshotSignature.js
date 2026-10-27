// Ignore only the transport timestamp, preserving all business fields and order.
export function globalSnapshotSignature({ savedAt, ...payload }) {
  return JSON.stringify(payload, (_key, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]]));
    }
    return value;
  });
}
