import {

  ChangeDetectionStrategy,

  Component,

  computed,

  ElementRef,

  HostListener,

  inject,

  input,

  signal,

  viewChild,

} from '@angular/core';

import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';



import { Auth } from '../../../features/auth/services/auth';

import { MobileViewportService } from '../../services/mobile-viewport.service';



@Component({

  selector: 'app-account-menu',

  standalone: true,

  imports: [RouterLink, TranslatePipe],

  templateUrl: './account-menu.component.html',

  styleUrl: './account-menu.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class AccountMenuComponent {

  private readonly auth = inject(Auth);

  private readonly router = inject(Router);

  private readonly mobile = inject(MobileViewportService);

  private readonly host = viewChild<ElementRef<HTMLElement>>('host');



  compact = input(false);



  protected readonly open = signal(false);

  protected readonly useSheet = computed(() => this.mobile.isMobile());

  protected readonly isLoggingOut = signal(false);

  protected readonly menuExpanded = computed(() =>

    this.useSheet() ? this.mobile.profileSheetOpen() : this.open(),

  );



  protected readonly user = this.auth.user;

  protected readonly avatarInitial = computed(() => {

    const current = this.auth.user();

    const source = current?.firstName || current?.email || 'U';

    return source.charAt(0).toUpperCase();

  });



  protected readonly displayName = computed(() => {

    const current = this.auth.user();

    if (!current) {

      return '';

    }

    const full = `${current.firstName ?? ''} ${current.lastName ?? ''}`.trim();

    return full || current.email;

  });



  @HostListener('document:click', ['$event'])

  protected onDocumentClick(event: MouseEvent): void {

    if (this.useSheet() || !this.open()) {

      return;

    }



    const root = this.host()?.nativeElement;

    if (root && !root.contains(event.target as Node)) {

      this.open.set(false);

    }

  }



  protected toggle(event: Event): void {

    event.stopPropagation();



    if (this.useSheet()) {

      if (this.mobile.profileSheetOpen()) {

        this.mobile.closeProfileSheet();

      } else {

        this.mobile.openProfileSheet();

      }

      return;

    }



    this.open.update((value) => !value);

  }



  protected close(): void {

    if (this.useSheet()) {

      this.mobile.closeProfileSheet();

      return;

    }



    this.open.set(false);

  }



  protected logout(): void {

    if (this.isLoggingOut()) {

      return;

    }



    this.isLoggingOut.set(true);

    this.auth.logout().subscribe({

      next: () => {

        this.isLoggingOut.set(false);

        this.close();

        void this.router.navigate(['/home']);

      },

      error: () => {

        this.isLoggingOut.set(false);

        this.close();

        void this.router.navigate(['/home']);

      },

    });

  }

}


