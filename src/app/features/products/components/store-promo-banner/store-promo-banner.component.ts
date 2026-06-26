import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { StorePromoBanner } from '../../models/product';

@Component({
  selector: 'app-store-promo-banner',
  standalone: true,
  templateUrl: './store-promo-banner.component.html',
  styleUrl: './store-promo-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorePromoBannerComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  banner = input.required<StorePromoBanner>();

  private readonly countdownSeconds = signal(0);

  protected readonly flashIconSrc = 'assets/images/flash-bolt.svg';

  protected readonly hours = computed(() =>
    Math.floor(this.countdownSeconds() / 3600)
      .toString()
      .padStart(2, '0'),
  );

  protected readonly minutes = computed(() =>
    Math.floor((this.countdownSeconds() % 3600) / 60)
      .toString()
      .padStart(2, '0'),
  );

  protected readonly seconds = computed(() =>
    (this.countdownSeconds() % 60).toString().padStart(2, '0'),
  );

  ngOnInit(): void {
    this.countdownSeconds.set(this.banner().initialCountdownSeconds);

    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const next = this.countdownSeconds();
        if (next > 0) {
          this.countdownSeconds.set(next - 1);
        }
      });
  }
}
