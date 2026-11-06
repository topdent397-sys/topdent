'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import { mediaUrl } from '@/lib/format';

export default function ProductImage({ src, alt, className = '', width = 640, quality = 78, loading = 'lazy', ...props }) {
  const originalSrc = mediaUrl(src);
  const optimizedSrc = mediaUrl(src, { width, quality });
  const [imageSrc, setImageSrc] = useState(optimizedSrc);
  useEffect(() => setImageSrc(optimizedSrc), [optimizedSrc]);
  return <img src={imageSrc} alt={alt || 'صورة المنتج'} loading={loading} decoding="async" className={className} onError={() => setImageSrc((current) => current === originalSrc ? '/placeholder.svg' : originalSrc)} {...props} />;
}
