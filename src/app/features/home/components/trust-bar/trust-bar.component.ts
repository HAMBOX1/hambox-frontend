import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TrustFeature } from '../../models/storefront-home';

@Component({
  selector: 'app-trust-bar',
  standalone: true,
  templateUrl: './trust-bar.component.html',
  styleUrl: './trust-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustBarComponent {
  features = input.required<readonly TrustFeature[]>();
}
