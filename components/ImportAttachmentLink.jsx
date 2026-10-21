import React, { useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "../supabase.js";
import { createImportAttachmentReader } from "../lib/importAttachments.js";
const readAttachment = createImportAttachmentReader(supabase);

export default function ImportAttachmentLink({ attachment: value }) {
  const attachment = typeof value === "string" ? { url: value } : value || {};
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <span>
    <button type="button" className="ghost" disabled={busy} title="下载附件" onClick={async () => {
      if (busy) return;
      setBusy(true); setError("");
      try {
        const blob = await readAttachment(attachment);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url; anchor.download = attachment.name || "attachment";
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (failure) { setError(failure?.message || "附件读取失败"); }
      finally { setBusy(false); }
    }}><Download size={14} aria-hidden="true" />{busy ? "正在下载" : (attachment.documentType || "附件") + "：" + (attachment.name || "下载")}</button>
    {error && <span role="alert" style={{ color: "#a32335", overflowWrap: "anywhere" }}>{error}</span>}
  </span>;
}
