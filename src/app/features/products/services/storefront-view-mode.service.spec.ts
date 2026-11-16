import { ALL_VIEW_MODES, resolveProductViews } from './storefront-view-mode.service';

describe('resolveProductViews', () => {
  it('gives everyone all four layouts until the admin narrows them', () => {
    expect(resolveProductViews(null, false, null)).toEqual({ allowed: ALL_VIEW_MODES, mode: 'comfortable' });
    expect(resolveProductViews({}, true, null).allowed).toEqual(ALL_VIEW_MODES);
  });

  it('limits a regular customer to the layouts the admin picked, keeping the switcher order', () => {
    const settings = { regularViews: ['list', 'comfortable'], regularDefault: 'list' };

    const view = resolveProductViews(settings, false, null);

    expect(view.allowed).toEqual(['comfortable', 'list']);
    expect(view.mode).toBe('list');
  });

  it('can pin a regular customer to a single layout', () => {
    const view = resolveProductViews({ regularViews: ['compact'], regularDefault: 'comfortable' }, false, 'list');

    // Their old stored pick ("list") and the stated default are both not allowed, so the only allowed layout wins.
    expect(view).toEqual({ allowed: ['compact'], mode: 'compact' });
  });

  it('lets an Elite customer use the Elite list and its default, independent of the regular list', () => {
    const settings = {
      regularViews: ['comfortable'],
      regularDefault: 'comfortable',
      eliteViews: ['comfortable', 'compact', 'dense', 'list'],
      eliteDefault: 'dense',
    };

    expect(resolveProductViews(settings, true, null)).toEqual({ allowed: ALL_VIEW_MODES, mode: 'dense' });
    expect(resolveProductViews(settings, false, null)).toEqual({ allowed: ['comfortable'], mode: 'comfortable' });
  });

  it('keeps the customer\'s own pick while it is still allowed', () => {
    const settings = { regularViews: ['comfortable', 'list'], regularDefault: 'comfortable' };

    expect(resolveProductViews(settings, false, 'list').mode).toBe('list');
  });

  it('never leaves the page without a layout when the admin saved an empty or invalid list', () => {
    expect(resolveProductViews({ regularViews: [] }, false, null)).toEqual({ allowed: ['comfortable'], mode: 'comfortable' });
    expect(resolveProductViews({ regularViews: ['nonsense'] }, false, null).allowed).toEqual(['comfortable']);
  });

  it('falls back to the first allowed layout when the stated default is not allowed', () => {
    const view = resolveProductViews({ regularViews: ['compact', 'list'], regularDefault: 'dense' }, false, null);

    expect(view.mode).toBe('compact');
  });
});
