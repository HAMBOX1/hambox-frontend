import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { AssistantFacade } from '../../services/assistant.facade';
import { SUGGESTIONS } from '../../data/assistant-flows.data';

@Component({
  selector: 'app-assistant-history',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './assistant-history.component.html',
  styleUrl: './assistant-history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantHistoryComponent {
  protected readonly facade = inject(AssistantFacade);
  protected readonly suggestions = SUGGESTIONS.slice(0, 3);

  protected readonly renamingId = signal<string | null>(null);
  protected renameDraft = '';

  protected onSearchInput(value: string): void {
    this.facade.setHistorySearch(value);
  }

  protected selectItem(id: string, event: Event): void {
    if ((event.target as HTMLElement).closest('.hi-tools, .hi-rename-input')) {
      return;
    }
    this.facade.loadHistoryConversation(id);
  }

  protected startRename(id: string, currentTitle: string, event: Event): void {
    event.stopPropagation();
    this.renamingId.set(id);
    this.renameDraft = currentTitle;
  }

  protected commitRename(id: string): void {
    this.facade.renameHistoryItem(id, this.renameDraft);
    this.renamingId.set(null);
  }

  protected cancelRename(): void {
    this.renamingId.set(null);
  }

  protected pin(id: string, event: Event): void {
    event.stopPropagation();
    this.facade.pinHistoryItem(id);
  }

  protected remove(id: string, event: Event): void {
    event.stopPropagation();
    this.facade.deleteHistoryItem(id);
  }
}
