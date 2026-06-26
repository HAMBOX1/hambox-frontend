import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';

@Component({
  selector: 'app-order-success-hero',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './order-success-hero.component.html',
  styleUrl: './order-success-hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderSuccessHeroComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  orderId = input.required<string>();

  protected readonly deliverySeconds = signal(2);

  ngOnInit(): void {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.deliverySeconds.update((value) => (value > 0 ? value - 1 : 0));
      });
  }

  protected formatDeliveryTime(): string {
    const seconds = this.deliverySeconds();
    return `0m ${String(seconds).padStart(2, '0')}s`;
  }
}
