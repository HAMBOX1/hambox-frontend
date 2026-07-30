import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { AiAssistantSectionComponent } from '../../components/ai-assistant-section/ai-assistant-section.component';
import { AiAssistantSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-ai-assistant-variant-default',
  standalone: true,
  imports: [AiAssistantSectionComponent],
  template: `<app-ai-assistant-section [config]="config()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAssistantVariantDefaultComponent {
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<AiAssistantSectionConfig>();
}
