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
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { FlashDealCardComponent } from '../../../../shared/components/flash-deal-card/flash-deal-card.component';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';
import { FlashDeal } from '../../models/storefront-home';
import { computeRemainingSeconds } from '../../../../shared/utils/countdown.util';

@Component({
  selector: 'app-flash-deals-section',
  standalone: true,
  imports: [FlashDealCardComponent, RouterLink, ScrollRevealDirective],
  templateUrl: './flash-deals-section.component.html',
  styleUrl: './flash-deals-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlashDealsSectionComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  deals = input.required<readonly FlashDeal[]>();
  initialCountdownSeconds = input.required<number>();
  countdownDateUtc = input<string | null>(null);
  sectionTitle = input('Flash Deals');
  sectionSubtitle = input('');
  countdownEnabled = input(true);
  showViewAllLink = input(true);

  private readonly countdownSeconds = signal(0);

  protected readonly flashIconSrc = 'assets/images/flash-bolt.svg';

  protected readonly countdownLabel = computed(() => {
    const total = this.countdownSeconds();
    const hours = Math.floor(total / 3600)
      .toString()
      .padStart(2, '0');
    const minutes = Math.floor((total % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (total % 60).toString().padStart(2, '0');
    return `Ends in ${hours}:${minutes}:${seconds}`;
  });

  ngOnInit(): void {
    const deadline = this.countdownDateUtc();
    this.countdownSeconds.set(computeRemainingSeconds(deadline, this.initialCountdownSeconds()));

    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (deadline) {
          this.countdownSeconds.set(computeRemainingSeconds(deadline, 0));
          return;
        }

        const next = this.countdownSeconds();
        if (next > 0) {
          this.countdownSeconds.set(next - 1);
        }
      });
  }
}
