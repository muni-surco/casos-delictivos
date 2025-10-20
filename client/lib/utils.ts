import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts Google Drive file ID from various URL formats
 */
export function extractDriveId(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.hostname.includes('drive.google.com')) return null;
    
    // Format: /file/d/{fileId}/view
    const match = u.pathname.match(/\/file\/d\/([^/]+)/);
    if (match) return match[1];
    
    // Format: ?id={fileId}
    const id = u.searchParams.get('id');
    if (id) return id;
    
    // Last resort: try last path segment if it looks like a file ID
    const parts = u.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && /^[A-Za-z0-9_-]{20,}$/.test(last)) return last;
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Converts any Google Drive URL to a thumbnail URL
 */
export function toImagePreviewUrl(url?: string): string | undefined {
  const id = extractDriveId(url);
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
  return url;
}

/**
 * Converts any Google Drive URL to a direct download URL
 */
export function toVideoPreviewUrl(url?: string): string | undefined {
  const id = extractDriveId(url);
  if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
  return url;
}

/**
 * Converts any Google Drive URL to an embed/preview URL
 */
export function toDriveIframePreview(url?: string): string | undefined {
  const id = extractDriveId(url);
  if (id) return `https://drive.google.com/file/d/${id}/preview`;
  return undefined;
}
