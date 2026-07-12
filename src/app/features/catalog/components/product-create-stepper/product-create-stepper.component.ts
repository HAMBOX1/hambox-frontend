import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ProductCreateStep, ProductCreateStepId } from '../../models/product.model';

@Component({
  selector: 'app-product-create-stepper',
  standalone: true,
  templateUrl: './product-create-stepper.component.html',
  styleUrl: './product-create-stepper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCreateStepperComponent {
  readonly steps = input.required<readonly ProductCreateStep[]>();
  readonly activeStep = input<ProductCreateStepId>('basic-information');

  readonly stepSelect = output<ProductCreateStepId>();

  protected readonly visibleSteps = computed(() => this.steps().filter((step) => step.enabled));

  protected onStepClick(step: ProductCreateStep): void {
    this.stepSelect.emit(step.id);
  }
}
