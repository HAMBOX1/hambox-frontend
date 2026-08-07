import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';

import { MembershipFeatureService } from '../../core/membership/membership-feature.service';

/** Structural directive gating an element by a membership FeatureFlag benefit — mirrors [hamboxHasPermission]. */
@Directive({
  selector: '[hamboxHasFeature]',
  standalone: true,
})
export class HasFeatureDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly featureService = inject(MembershipFeatureService);

  readonly hamboxHasFeature = input.required<string>();

  constructor() {
    effect(() => {
      const allowed = this.featureService.hasFeature(this.hamboxHasFeature());

      this.viewContainer.clear();

      if (allowed) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    });
  }
}
