import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { TrustFeature } from '../../models/storefront-home';

@Component({
  selector: 'app-trust-bar',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './trust-bar.component.html',
  styleUrl: './trust-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustBarComponent {
  features = input.required<readonly TrustFeature[]>();
}
