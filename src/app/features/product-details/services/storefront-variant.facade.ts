import { computed, inject, Injectable, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';



import { InventoryApiService } from '../../catalog/services/inventory-api.service';

import {

  ProductOptionGroupDto,

  StorefrontProductConfigurationDto,

} from '../../catalog/models/inventory-api.model';

import {

  defaultSelections,

  getAvailableOptionsForGroup,

  isOptionCompatible,

  resolveVariant,

  ResolvedStorefrontVariant,

  visibleOptionGroups,

} from '../utils/storefront-variant.resolver';



@Injectable({

  providedIn: 'root',

})

export class StorefrontVariantFacade {

  private readonly api = inject(InventoryApiService);



  private readonly configurationState = signal<StorefrontProductConfigurationDto | null>(null);

  private readonly selectedByGroupState = signal<Record<string, string>>({});

  private readonly loadingState = signal(false);

  private readonly errorState = signal<string | null>(null);



  readonly configuration = this.configurationState.asReadonly();

  readonly selectedByGroup = this.selectedByGroupState.asReadonly();

  readonly loading = this.loadingState.asReadonly();

  readonly error = this.errorState.asReadonly();



  readonly hasVariants = computed(() => (this.configurationState()?.variants.length ?? 0) > 0);

  readonly hasOptionGroups = computed(
    () =>
      this.configurationState()?.optionGroups.some((group) => group.options.length > 0) ?? false,
  );

  /** Root groups plus any nested child group whose parent option is currently selected — see `visibleOptionGroups`. */
  readonly visibleGroups = computed(() => {
    const configuration = this.configurationState();
    if (!configuration) {
      return [];
    }
    return visibleOptionGroups(configuration.optionGroups, this.selectedByGroupState());
  });



  readonly resolved = computed<ResolvedStorefrontVariant>(() => {

    const configuration = this.configurationState();

    if (!configuration) {

      return {

        variant: null,

        price: 0,

        comparePrice: null,

        availableStock: 0,

        isLowStock: false,

        isOutOfStock: true,

        sku: null,

      };

    }



    return resolveVariant(configuration, this.selectedByGroupState());

  });



  async load(productId: string, preview = false): Promise<void> {

    this.loadingState.set(true);

    this.errorState.set(null);



    try {

      const configuration = await firstValueFrom(this.api.getStorefrontConfiguration(productId, preview));

      this.configurationState.set(configuration);

      this.selectedByGroupState.set(

        configuration.variants.length > 0 ? defaultSelections(configuration) : {},

      );

    } catch {

      this.configurationState.set(null);

      this.selectedByGroupState.set({});

      this.errorState.set('Unable to load product configuration.');

    } finally {

      this.loadingState.set(false);

    }

  }



  reset(): void {

    this.configurationState.set(null);

    this.selectedByGroupState.set({});

    this.errorState.set(null);

    this.loadingState.set(false);

  }



  setGroupSelection(groupId: string, optionId: string): void {

    const configuration = this.configurationState();

    if (!configuration) {

      return;

    }



    this.selectedByGroupState.update((current) => {

      let next: Record<string, string> = {

        ...current,

        [groupId]: optionId,

      };



      for (const group of configuration.optionGroups) {

        if (group.id === groupId) {

          continue;

        }



        const selected = next[group.id];

        if (!selected) {

          continue;

        }



        if (!isOptionCompatible(configuration, group.id, selected, next)) {

          const { [group.id]: _, ...rest } = next;

          next = rest;

        }

      }



      return next;

    });

  }



  optionsForGroup(group: ProductOptionGroupDto): readonly { id: string; label: string; disabled: boolean; descriptionHtml?: string | null }[] {

    const configuration = this.configurationState();

    if (!configuration) {

      return [];

    }



    return getAvailableOptionsForGroup(configuration, group.id, this.selectedByGroupState());

  }

}


