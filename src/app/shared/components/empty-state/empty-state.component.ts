import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss']
})
export class EmptyStateComponent {
  @Input() icon: string = 'pi pi-folder-open';
  @Input() title: string = 'No Results Found';
  @Input() description: string = 'We could not find anything matching your criteria.';
  @Input() actionLabel?: string;
  @Input() actionIcon?: string;
  
  @Output() action = new EventEmitter<void>();

  onAction() {
    this.action.emit();
  }
}
