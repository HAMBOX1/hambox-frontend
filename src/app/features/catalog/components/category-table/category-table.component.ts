import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { Category } from '../../models/category.model';

@Component({
  selector: 'app-category-table',
  standalone: true,
  imports: [TableModule, TagModule],
  templateUrl: './category-table.component.html',
  styleUrl: './category-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryTableComponent {
  readonly categories = input.required<readonly Category[]>();
  readonly loading = input(false);
  readonly totalRecords = input(0);
  readonly pageSize = input(20);
  readonly first = input(0);
  readonly searchActive = input(false);

  readonly pageChange = output<TableLazyLoadEvent>();

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.pageChange.emit(event);
  }
}
