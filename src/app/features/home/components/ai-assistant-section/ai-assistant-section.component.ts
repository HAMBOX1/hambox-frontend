import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AiAssistantSectionConfig } from '../../section-registry/models/section-config.model';

@Component({
  selector: 'app-ai-assistant-section',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './ai-assistant-section.component.html',
  styleUrl: './ai-assistant-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAssistantSectionComponent {
  readonly config = input.required<AiAssistantSectionConfig>();
}
