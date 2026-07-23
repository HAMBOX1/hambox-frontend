import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface AdminStepperStep {
  readonly label: string;
  readonly icon?: string;
}

/** Step indicator row for multi-step admin wizards (import/export, onboarding, etc.). Display-only — the host page owns which step's content is rendered. */
@Component({
  selector: 'app-admin-stepper',
  standalone: true,
  templateUrl: './admin-stepper.component.html',
  styleUrl: './admin-stepper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStepperComponent {
  readonly steps = input.required<readonly AdminStepperStep[]>();
  readonly activeIndex = input(0);

  protected stateOf(index: number): 'done' | 'active' | 'upcoming' {
    if (index < this.activeIndex()) {
      return 'done';
    }

    return index === this.activeIndex() ? 'active' : 'upcoming';
  }
}
