import { resolveSectionConfig } from './section-config-defaults';

const starter = {
  title: 'Sample title',
  viewAllText: 'View all',
  limit: 4,
  visible: true,
  cards: [{ id: 'a', title: 'Sample card' }],
  nested: { x: 1 },
};

describe('resolveSectionConfig', () => {
  it('gives a section that was never configured the starter content', () => {
    expect(resolveSectionConfig({}, starter)).toEqual(starter);
    expect(resolveSectionConfig(null, starter)).toEqual(starter);
    expect(resolveSectionConfig(undefined, starter)).toEqual(starter);
  });

  it('keeps the shared _common options on a never-configured section', () => {
    const common = { buttonLabel: 'Shop', buttonUrl: '/products' };

    expect(resolveSectionConfig({ _common: common }, starter)).toEqual({ ...starter, _common: common });
  });

  it('never mixes the starter\'s sample content into what the admin wrote', () => {
    const resolved = resolveSectionConfig({ title: 'My title' }, starter) as typeof starter;

    expect(resolved.title).toBe('My title');
    expect(resolved.viewAllText).toBe('');
    expect(resolved.cards).toEqual([]);
    expect(resolved.nested).toEqual({});
    // Plain numbers and switches carry over, so nothing reads a missing value.
    expect(resolved.limit).toBe(4);
    expect(resolved.visible).toBe(true);
  });

  it('leaves a value the admin set alone, even an empty one', () => {
    const resolved = resolveSectionConfig({ title: '', cards: [] }, starter) as typeof starter;

    expect(resolved.title).toBe('');
    expect(resolved.cards).toEqual([]);
  });

  it('returns the config as it is when the variant has no starter', () => {
    expect(resolveSectionConfig({ a: 1 }, undefined)).toEqual({ a: 1 });
    expect(resolveSectionConfig('garbage', undefined)).toEqual({});
  });
});
