import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

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

  protected onStepClick(step: ProductCreateStep): void {
    if (!step.enabled) {
      return;
    }

    this.stepSelect.emit(step.id);
  }
}
