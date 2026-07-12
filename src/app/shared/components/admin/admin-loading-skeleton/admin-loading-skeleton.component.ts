import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-admin-loading-skeleton',
  standalone: true,
  imports: [SkeletonModule],
  templateUrl: './admin-loading-skeleton.component.html',
  styleUrl: './admin-loading-skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoadingSkeletonComponent {
  readonly variant = input<'page' | 'table' | 'form' | 'detail'>('page');
  readonly rows = input(4);
}
