import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { AssistantFacade } from '../../services/assistant.facade';
import { QUICK_SUGGESTIONS } from '../../data/assistant-flows.data';
import { FlowKey } from '../../models/assistant.models';

const TEXTAREA_MAX_HEIGHT_PX = 120;

@Component({
  selector: 'app-assistant-composer',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './assistant-composer.component.html',
  styleUrl: './assistant-composer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantComposerComponent {
  protected readonly facade = inject(AssistantFacade);
  protected readonly quickSuggestions = QUICK_SUGGESTIONS;

  protected readonly inputValue = signal('');

  private readonly composerInput = viewChild<ElementRef<HTMLTextAreaElement>>('composerInput');

  focus(): void {
    this.composerInput()?.nativeElement.focus();
  }

  protected onQuickChip(flow: FlowKey): void {
    this.facade.selectSuggestion(flow);
  }

  protected onInputChange(value: string): void {
    this.inputValue.set(value);
    this.resizeTextarea();
  }

  protected onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.handleSend();
    }
  }

  protected handleSend(): void {
    const text = this.inputValue().trim();
    if (!text) {
      return;
    }
    this.facade.send(text);
    this.inputValue.set('');
    this.resizeTextarea();
  }

  private resizeTextarea(): void {
    const el = this.composerInput()?.nativeElement;
    if (!el) {
      return;
    }
    queueMicrotask(() => {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`;
    });
  }
}
