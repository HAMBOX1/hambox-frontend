import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  templateUrl: './loading-skeleton.component.html',
  styleUrls: ['./loading-skeleton.component.scss']
})
export class LoadingSkeletonComponent {
  @Input() type: 'card' | 'list' | 'detail' = 'card';
  @Input() count: number = 1;

  get countArray(): number[] {
    return Array(this.count).fill(0);
  }
}
