import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-storefront-footer',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './storefront-footer.component.html',
  styleUrl: './storefront-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontFooterComponent {
  protected readonly logoSrc = 'assets/images/top-nav/hambox-title.png';
  protected readonly facebookIcon = 'assets/images/footer/facebook.svg';
  protected readonly whatsappIcon = 'assets/images/footer/whatsapp.svg';
  protected readonly telegramIcon = 'assets/images/footer/telegram.svg';

  protected readonly navigationLinks = [
    { labelKey: 'FOOTER.LINKS.MARKETPLACE', route: '/products' },
    { labelKey: 'FOOTER.LINKS.GIFT_CARDS', route: '/products' },
    { labelKey: 'FOOTER.LINKS.SUBSCRIPTIONS', route: '/products' },
    { labelKey: 'FOOTER.LINKS.AFFILIATE', route: '/products' },
  ] as const;

  protected readonly protocolLinks = [
    { labelKey: 'FOOTER.LINKS.TERMS', route: '/support-chat' },
    { labelKey: 'FOOTER.LINKS.PRIVACY', route: '/support-chat' },
    { labelKey: 'FOOTER.LINKS.SUPPORT', route: '/support-chat' },
    { labelKey: 'FOOTER.LINKS.VERIFICATION', route: '/support-chat' },
  ] as const;
}
