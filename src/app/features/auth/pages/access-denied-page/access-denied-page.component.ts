import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-access-denied-page',
  standalone: true,
  imports: [RouterLink, ButtonModule, TranslatePipe],
  template: `
    <section class="access-denied">
      <h1>{{ 'AUTH.ACCESS_DENIED.TITLE' | translate }}</h1>
      <p>{{ messageKey() | translate }}</p>
      <div class="access-denied__actions">
        <a routerLink="/admin/products" pButton>{{ 'AUTH.ACCESS_DENIED.GO_TO_ADMIN' | translate }}</a>
        <a routerLink="/home" pButton severity="secondary">{{ 'AUTH.ACCESS_DENIED.GO_TO_STOREFRONT' | translate }}</a>
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

  protected messageKey(): string {
    switch (this.context()) {
      case 'admin-on-customer':
        return 'AUTH.ACCESS_DENIED.ADMIN_ON_CUSTOMER';
      case 'permission':
        return 'AUTH.ACCESS_DENIED.PERMISSION';
      default:
        return 'AUTH.ACCESS_DENIED.GENERIC';
    }
  }
}
