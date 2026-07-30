import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { UiButtonComponent } from '../../../../shared/components/ui/ui-button/ui-button.component';
import { UiInputComponent } from '../../../../shared/components/ui/ui-input/ui-input.component';
import { CommunityNewsletterSectionConfig } from '../../section-registry/models/section-config.model';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-community-newsletter-section',
  standalone: true,
  imports: [RouterLink, FormsModule, UiInputComponent, UiButtonComponent],
  templateUrl: './community-newsletter-section.component.html',
  styleUrl: './community-newsletter-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityNewsletterSectionComponent {
  readonly config = input.required<CommunityNewsletterSectionConfig>();

  readonly emailSubmitted = output<string>();

  protected readonly email = signal('');
  protected readonly touched = signal(false);

  protected get emailInvalid(): boolean {
    return this.touched() && !EMAIL_PATTERN.test(this.email().trim());
  }

  protected onSubmit(): void {
    this.touched.set(true);
    const value = this.email().trim();
    if (EMAIL_PATTERN.test(value)) {
      this.emailSubmitted.emit(value);
    }
  }
}
