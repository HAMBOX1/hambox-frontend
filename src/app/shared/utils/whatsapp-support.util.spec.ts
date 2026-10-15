import { buildSupportMessage, buildWhatsAppSupportUrl } from './whatsapp-support.util';

/** Audit R51 — the support button opens WhatsApp with the order already written in, and nothing else. */
describe('whatsapp support link', () => {
  it('pre-fills the message on a wa.me link', () => {
    const url = buildWhatsAppSupportUrl('https://wa.me/201001234567', 'Hello, order HB-1');

    expect(url).toBe('https://wa.me/201001234567?text=Hello%2C+order+HB-1');
  });

  it('keeps existing query parameters (api.whatsapp.com/send?phone=…)', () => {
    const url = buildWhatsAppSupportUrl('https://api.whatsapp.com/send?phone=201001234567', 'Hi');

    expect(url).toContain('phone=201001234567');
    expect(url).toContain('text=Hi');
  });

  it('refuses anything that is not a WhatsApp address', () => {
    expect(buildWhatsAppSupportUrl('https://evil.example/wa.me', 'Hi')).toBeNull();
    expect(buildWhatsAppSupportUrl('javascript:alert(1)', 'Hi')).toBeNull();
    expect(buildWhatsAppSupportUrl('http://wa.me/201001234567', 'Hi')).toBeNull();
    expect(buildWhatsAppSupportUrl('', 'Hi')).toBeNull();
    expect(buildWhatsAppSupportUrl(null, 'Hi')).toBeNull();
  });

  it('writes the order number and product into the message, never account details', () => {
    const message = buildSupportMessage({ orderNumber: 'HB-1001', productName: 'PSN $25' });

    expect(message).toContain('HB-1001');
    expect(message).toContain('PSN $25');
    expect(message).not.toMatch(/@/);
  });

  it('still produces a sensible message without an order', () => {
    expect(buildSupportMessage({})).toBe('Hello HAMBOX support, I need some help.');
  });
});
