import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';

import { SeasonalCampaignBannerConfig } from '../../section-registry/models/section-config.model';

@Component({
  selector: 'app-seasonal-campaign-banner',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './seasonal-campaign-banner.component.html',
  styleUrl: './seasonal-campaign-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeasonalCampaignBannerComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly banner = input.required<SeasonalCampaignBannerConfig>();

  private readonly countdownSeconds = signal(0);

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

  protected readonly seconds = computed(() => (this.countdownSeconds() % 60).toString().padStart(2, '0'));

  ngOnInit(): void {
    this.countdownSeconds.set(this.banner().countdownSeconds);

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
