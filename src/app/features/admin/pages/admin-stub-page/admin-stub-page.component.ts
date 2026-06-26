import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component({
  selector: 'app-admin-stub-page',
  standalone: true,
  templateUrl: './admin-stub-page.component.html',
  styleUrl: './admin-stub-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStubPageComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly title = toSignal(
    this.route.data.pipe(map((data) => (data['title'] as string) ?? 'Admin')),
    { initialValue: 'Admin' },
  );

  protected readonly description = toSignal(
    this.route.data.pipe(
      map((data) => (data['description'] as string) ?? 'This section will be available in a future sprint.'),
    ),
    { initialValue: 'This section will be available in a future sprint.' },
  );
}
