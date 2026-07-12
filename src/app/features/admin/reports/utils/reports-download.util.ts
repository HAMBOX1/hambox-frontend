export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function filenameFromContentDisposition(
  header: string | null,
  fallback: string,
): string {
  if (!header) {
    return fallback;
  }

  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1].trim());
    } catch {
      return utfMatch[1].trim();
    }
  }

  const plainMatch = /filename="?([^";]+)"?/i.exec(header);
  return plainMatch?.[1]?.trim() || fallback;
}