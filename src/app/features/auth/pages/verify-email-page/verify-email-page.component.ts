import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiError } from '../../../../core/models/api-error.model';
import { Auth } from '../../services/auth';

type VerifyState = 'loading' | 'success' | 'error' | 'missing-token';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './verify-email-page.component.html',
  styleUrl: './verify-email-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailPageComponent implements OnInit {
  private readonly auth = inject(Auth);
  private readonly route = inject(ActivatedRoute);

  protected readonly state = signal<VerifyState>('loading');
  protected readonly message = signal('Verifying your email address...');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('missing-token');
      this.message.set('Verification token is missing from this link.');
      return;
    }

    this.auth
      .verifyEmail(token)
      .pipe(finalize(() => undefined))
      .subscribe({
        next: () => {
          this.state.set('success');
          this.message.set('Your email has been verified. You can now sign in.');
        },
        error: (error: unknown) => {
          this.state.set('error');
          this.message.set(
            error instanceof ApiError
              ? error.message
              : 'Unable to verify your email. The link may have expired.',
          );
        },
      });
  }
}
