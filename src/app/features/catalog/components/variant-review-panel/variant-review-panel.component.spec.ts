import { describe, expect, it } from 'vitest';

import { ProductOptionGroupDto } from '../../models/inventory-api.model';
import { missingOptionGroups } from './variant-review-panel.component';

function group(id: string, name: string, sortOrder: number, optionIds: string[], parentOptionId: string | null = null): ProductOptionGroupDto {
  return {
    id,
    productId: 'p',
    parentOptionId,
    key: id,
    displayName: name,
    sortOrder,
    isRequired: true,
    options: optionIds.map((o, i) => ({ id: o, value: o, label: o, sortOrder: i })),
  } as unknown as ProductOptionGroupDto;
}

describe('missingOptionGroups', () => {
  const groups = [
    group('region', 'Region', 0, ['turkey', 'ukraine']),
    group('type', 'Type', 1, ['essential', 'extra']),
    group('duration', 'Duration', 2, ['1m', '3m']),
  ];

  it('lists the groups a half-choice still has to fill, in order', () => {
    expect(missingOptionGroups(groups, ['ukraine', 'essential']).map((g) => g.displayName)).toEqual(['Duration']);
    expect(missingOptionGroups(groups, ['ukraine']).map((g) => g.displayName)).toEqual(['Type', 'Duration']);
    expect(missingOptionGroups(groups, []).map((g) => g.displayName)).toEqual(['Region', 'Type', 'Duration']);
  });

  it('is empty for a complete combination', () => {
    expect(missingOptionGroups(groups, ['ukraine', 'essential', '1m'])).toEqual([]);
  });

  it('asks for a child group only once its parent option is chosen', () => {
    const tree = [
      group('plan', 'Plan', 0, ['essential', 'extra']),
      group('delivery', 'Delivery type', 0, ['new', 'renew'], 'essential'),
    ];

    expect(missingOptionGroups(tree, ['extra'])).toEqual([]);
    expect(missingOptionGroups(tree, ['essential']).map((g) => g.displayName)).toEqual(['Delivery type']);
  });
});
