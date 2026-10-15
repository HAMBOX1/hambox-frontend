const WHATSAPP_HOSTS = new Set(['wa.me', 'api.whatsapp.com', 'web.whatsapp.com', 'whatsapp.com', 'www.whatsapp.com']);

/**
 * Turns the store's configured WhatsApp link into one that opens the chat with a message already typed
 * (audit R51). Returns null when the configured URL is not a WhatsApp address, so the button is simply
 * not shown rather than sending the customer somewhere unexpected.
 */
export function buildWhatsAppSupportUrl(configuredUrl: string | null | undefined, message: string): string | null {
  if (!configuredUrl) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(configuredUrl.trim());
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' || !WHATSAPP_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  url.searchParams.set('text', message);
  return url.toString();
}

export interface SupportMessageContext {
  readonly orderNumber?: string | null;
  readonly productName?: string | null;
  readonly issue?: string | null;
}

/** The pre-filled text: who is asking is the chat itself, so only the order / product reference goes in. */
export function buildSupportMessage(context: SupportMessageContext): string {
  const parts = ['Hello HAMBOX support,'];

  if (context.orderNumber) {
    parts.push(`I need help with my order ${context.orderNumber}.`);
  } else {
    parts.push('I need some help.');
  }

  if (context.productName) {
    parts.push(`Product: ${context.productName}.`);
  }

  if (context.issue) {
    parts.push(context.issue);
  }

  return parts.join(' ');
}
