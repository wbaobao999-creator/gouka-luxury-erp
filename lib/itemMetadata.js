const START = "\n__GOUKA_ITEM_AUDIT_V1__";
const END = "__END_GOUKA_ITEM_AUDIT__";
const EXTRA_FIELDS = ["dutyAmount", "dutyCurrency", "dutyRateToJpy", "otherCostAmount", "otherCostCurrency", "otherCostRateToJpy", "storageLocation", "shelfLocation"];

export function readItemAudit(memo = "") {
  const text = String(memo);
  const start = text.lastIndexOf(START);
  if (start < 0 || !text.endsWith(END)) return { memo: text, audit: {} };
  try {
    const audit = JSON.parse(text.slice(start + START.length, -END.length));
    if (!audit || audit.version !== 1 || !Array.isArray(audit.ledgerHistory)) return { memo: text, audit: {} };
    return { memo: text.slice(0, start), audit };
  } catch { return { memo: text, audit: {} }; }
}

// Existing memo column makes audit round-trips safe before a schema migration.
export function writeItemAudit(memo, item) {
  const audit = {
    version: 1,
    ledgerStatus: item.ledgerStatus || "有效",
    ledgerVoidReason: item.ledgerVoidReason || "",
    ledgerUpdatedAt: item.ledgerUpdatedAt || "",
    ledgerHistory: Array.isArray(item.ledgerHistory) ? item.ledgerHistory : [],
    deletedAt: item.deletedAt || "",
    deletedReason: item.deletedReason || "",
    recordExtras: Object.fromEntries(EXTRA_FIELDS.filter((key) => item[key] !== undefined).map((key) => [key, item[key]]))
  };
  return readItemAudit(memo).memo + START + JSON.stringify(audit) + END;
}
