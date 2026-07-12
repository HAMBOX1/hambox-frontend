import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-access-denied-page',
  standalone: true,
  imports: [RouterLink, ButtonModule],
  template: `
    <section class="access-denied">
      <h1>Access denied</h1>
      <p>
        @if (context() === 'admin-on-customer') {
          Administrative sessions cannot access storefront customer features. Sign out of the admin portal or use a customer account.
        } @else {
          You do not have permission to view this page.
        }
      </p>
      <div class="access-denied__actions">
        <a routerLink="/admin/dashboard" pButton>Go to Admin</a>
        <a routerLink="/home" pButton severity="secondary">Go to Storefront</a>
      </div>
    </section>
  `,
  styles: `
    .access-denied {
      min-height: 60vh;
      display: grid;
      place-content: center;
      gap: 1rem;
      padding: 2rem;
      text-align: center;
    }

    .access-denied__actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      flex-wrap: wrap;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessDeniedPageComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly context = () => this.route.snapshot.queryParamMap.get('context');
}
