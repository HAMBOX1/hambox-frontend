import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-product-form-footer',
  standalone: true,
  imports: [TranslatePipe, ButtonModule],
  templateUrl: './product-form-footer.component.html',
  styleUrl: './product-form-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormFooterComponent {
  readonly submitting = input(false);

  readonly cancel = output<void>();
  readonly create = output<void>();

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected onCreate(): void {
    this.create.emit();
  }
}
