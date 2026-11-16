import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { AiAssistantSectionConfig } from '../../section-registry/models/section-config.model';
import { HamboxLinkDirective } from '../../../../shared/directives/hambox-link.directive';

@Component({
  selector: 'app-ai-assistant-section',
  standalone: true,
  imports: [HamboxLinkDirective],
  templateUrl: './ai-assistant-section.component.html',
  styleUrl: './ai-assistant-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAssistantSectionComponent {
  readonly config = input.required<AiAssistantSectionConfig>();
}
