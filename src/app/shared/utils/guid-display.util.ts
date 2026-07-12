/** Short display for GUIDs: `aedfb3a6...3522` */
export function formatShortGuid(id: string): string {
  const normalized = id.replace(/-/g, '').toLowerCase();
  if (normalized.length < 12) {
    return id;
  }

  return `${normalized.slice(0, 8)}...${normalized.slice(-4)}`;
}

export async function copyToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
