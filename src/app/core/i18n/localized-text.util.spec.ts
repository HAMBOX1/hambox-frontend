import { resolveLocalizedText } from './localized-text.util';

describe('resolveLocalizedText', () => {
  it('returns Arabic when active and present', () => {
    expect(resolveLocalizedText('Hello', 'مرحبا', 'ar')).toBe('مرحبا');
  });

  it('falls back to English when Arabic is empty', () => {
    expect(resolveLocalizedText('Hello', '', 'ar')).toBe('Hello');
    expect(resolveLocalizedText('Hello', null, 'ar')).toBe('Hello');
    expect(resolveLocalizedText('Hello', undefined, 'ar')).toBe('Hello');
  });

  it('returns English when language is English regardless of Arabic value', () => {
    expect(resolveLocalizedText('Hello', 'مرحبا', 'en')).toBe('Hello');
  });
});
