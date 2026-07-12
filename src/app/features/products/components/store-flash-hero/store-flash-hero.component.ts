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
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { interval } from 'rxjs';

@Component({
  selector: 'app-store-flash-hero',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './store-flash-hero.component.html',
  styleUrl: './store-flash-hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreFlashHeroComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  sectionTitle = input('Flash Deals');
  sectionSubtitle = input('');
  initialCountdownSeconds = input(0);
  countdownEnabled = input(true);
  dealCount = input(0);
  backgroundImageUrl = input('assets/images/hambox-hero-background.png');

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
    this.countdownSeconds.set(this.initialCountdownSeconds());

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
