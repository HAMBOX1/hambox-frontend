import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-payment-processing-card',
  standalone: true,
  templateUrl: './payment-processing-card.component.html',
  styleUrl: './payment-processing-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentProcessingCardComponent {
  progress = input(0);
  stageLabel = input('Processing Transaction');
}
