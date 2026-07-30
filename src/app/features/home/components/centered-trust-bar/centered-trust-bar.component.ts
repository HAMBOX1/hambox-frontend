import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TrustFeature } from '../../models/storefront-home';

@Component({
  selector: 'app-centered-trust-bar',
  standalone: true,
  templateUrl: './centered-trust-bar.component.html',
  styleUrl: './centered-trust-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CenteredTrustBarComponent {
  readonly features = input.required<readonly TrustFeature[]>();
}
