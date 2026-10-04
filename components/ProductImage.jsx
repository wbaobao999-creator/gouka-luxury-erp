import React, { useState } from "react";
import { productThumbnailUrl } from "../lib/productImages.js";

export default function ProductImage({ src, onError, ...props }) {
  const [failedSource, setFailedSource] = useState(null);
  const thumbnail = productThumbnailUrl(src);
  const displaySource = failedSource === src ? src : thumbnail;
  return <img {...props} src={displaySource} loading={props.loading || "lazy"} decoding="async"
    onError={event => {
      if (displaySource !== src) setFailedSource(src);
      else onError?.(event);
    }} />;
}
