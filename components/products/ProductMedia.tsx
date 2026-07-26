"use client";

import { ShoppingBag } from "lucide-react";
import { useState } from "react";

interface ProductMediaProps {
  alt: string;
  imageUrl: string | null | undefined;
  imageClassName?: string;
  iconClassName?: string;
}

function isWebUrl(value: string | null | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function ProductMedia({
  alt,
  imageUrl,
  imageClassName = "size-full object-cover",
  iconClassName = "size-16 opacity-80 drop-shadow-sm",
}: ProductMediaProps) {
  const [failed, setFailed] = useState(false);

  if (!isWebUrl(imageUrl) || failed) {
    return (
      <ShoppingBag
        className={iconClassName}
        strokeWidth={1.35}
        aria-hidden="true"
      />
    );
  }

  return (
    // Arbitrary marketplace hosts cannot be declared statically for next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl ?? undefined}
      alt={alt}
      className={imageClassName}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
