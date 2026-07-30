import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { HeroGridShowcaseConfig } from '../../section-registry/models/section-config.model';

@Component({
  selector: 'app-hero-grid-showcase',
  standalone: true,
  imports: [ButtonModule, RouterLink],
  templateUrl: './hero-grid-showcase.component.html',
  styleUrl: './hero-grid-showcase.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroGridShowcaseComponent {
  readonly hero = input.required<HeroGridShowcaseConfig>();

  protected readonly boltIcon = 'assets/images/hambox-hero-bolt.svg';
}
