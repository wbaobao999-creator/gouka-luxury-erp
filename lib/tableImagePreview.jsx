import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react";

function isTablePhoto(image) {
  if (!image?.matches("img.thumb")) return false;
  return !!(image.closest(".sales-center") || image.closest(".panel")?.querySelector('[aria-label="台账交易日期"]'));
}

export function originalImageCandidates(source) {
  try {
    const url = new URL(source);
    if (url.hostname.endsWith(".supabase.co") && url.pathname.includes("/storage/v1/object/public/product-images/") && /_thumbv1\.thumb\.jpg$/i.test(url.pathname)) {
      return ["jpg", "png", "webp", "gif"].map(ext => {
        const original = new URL(url);
        original.pathname = original.pathname.replace(/\.thumb\.jpg$/i, "." + ext);
        return original.href;
      }).concat(source);
    }
  } catch { /* Data URLs and old image paths are already original sources. */ }
  return [source];
}

function TableImagePreview() {
  const [photo, setPhoto] = useState(null);
  const [candidate, setCandidate] = useState(0);
  const [scale, setScale] = useState(1);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const closeButton = useRef(null);
  const trigger = useRef(null);
  function close() {
    setPhoto(null);
    trigger.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    function mark(root) {
      const images = root instanceof Element && root.matches("img.thumb") ? [root] : root.querySelectorAll?.("img.thumb") || [];
      for (const image of images) if (isTablePhoto(image)) {
        image.setAttribute("role", "button");
        image.setAttribute("tabindex", "0");
        image.setAttribute("aria-label", "查看商品大图");
        image.style.cursor = "zoom-in";
      }
    }
    function open(event) {
      const image = event.target instanceof Element ? event.target.closest("img.thumb") : null;
      if (!isTablePhoto(image) || (event.type === "keydown" && !["Enter", " "].includes(event.key))) return;
      event.preventDefault();
      trigger.current = image;
      setCandidate(0); setScale(1); setFailed(false); setLoaded(false);
      setPhoto({ sources: originalImageCandidates(image.currentSrc || image.src), alt: image.alt || "商品图片" });
    }
    mark(document);
    const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node instanceof Element) mark(node); })));
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", open);
    document.addEventListener("keydown", open);
    return () => { observer.disconnect(); document.removeEventListener("click", open); document.removeEventListener("keydown", open); };
  }, []);

  useEffect(() => {
    if (!photo) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    function keydown(event) {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key === "Tab") {
        const controls = closeButton.current?.closest('[role="dialog"]')?.querySelectorAll("button");
        if (!controls?.length) return;
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls[controls.length - 1].focus(); }
        else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) { event.preventDefault(); controls[0].focus(); }
      }
    }
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); };
  }, [photo]);

  if (!photo) return null;
  return <div className="image-modal table-photo-preview" role="dialog" aria-modal="true" aria-label="商品大图" onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="image-modal-tools">
      <button type="button" title="缩小" aria-label="缩小" onClick={() => setScale(value => Math.max(0.5, value - 0.25))}><ZoomOut size={18} /></button>
      <span style={{ minWidth: 44, textAlign: "center" }}>{Math.round(scale * 100)}%</span>
      <button type="button" title="放大" aria-label="放大" onClick={() => setScale(value => Math.min(3, value + 0.25))}><ZoomIn size={18} /></button>
      <button type="button" title="复位" aria-label="复位" onClick={() => setScale(1)}><RotateCcw size={18} /></button>
      <button type="button" ref={closeButton} title="关闭大图" aria-label="关闭大图" onClick={close}><X size={18} /></button>
    </div>
    {!loaded && !failed && <span role="status" style={{ position: "absolute", bottom: 20, color: "white" }}>图片加载中</span>}
    {failed ? <span role="status" style={{ color: "white" }}>图片暂时无法加载</span> : <img key={photo.sources[candidate]} src={photo.sources[candidate]} alt={photo.alt} style={{ transform: `scale(${scale})` }} onLoad={() => setLoaded(true)} onError={() => { setLoaded(false); if (candidate + 1 < photo.sources.length) setCandidate(candidate + 1); else setFailed(true); }} />}
    {loaded && photo.sources.length > 1 && candidate === photo.sources.length - 1 && <span role="status" style={{ position: "absolute", bottom: 20, color: "white" }}>原图不可用，当前显示缩略图</span>}
  </div>;
}

if (!document.getElementById("table-image-preview-root")) {
  const host = document.createElement("div");
  host.id = "table-image-preview-root";
  document.body.appendChild(host);
  createRoot(host).render(<TableImagePreview />);
}
