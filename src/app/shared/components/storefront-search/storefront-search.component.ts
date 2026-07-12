import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import {
  StorefrontSearchService,
  StorefrontSearchSuggestion,
} from '../../services/storefront-search.service';

@Component({
  selector: 'app-storefront-search',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './storefront-search.component.html',
  styleUrl: './storefront-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontSearchComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly searchService = inject(StorefrontSearchService);

  readonly initialValue = input('');
  readonly mobile = input(false);
  readonly submitted = output<void>();

  protected readonly searchIconSrc = 'assets/images/top-nav/search-icon.svg';
  protected readonly value = signal('');
  protected readonly open = signal(false);
  protected readonly loading = signal(false);
  protected readonly suggestions = signal<readonly StorefrontSearchSuggestion[]>([]);
  protected readonly activeIndex = signal(-1);

  private readonly root = viewChild<ElementRef<HTMLElement>>('searchRoot');
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private requestId = 0;

  constructor() {
    const initial = this.initialValue();
    if (initial) {
      this.value.set(initial);
    }
  }

  ngOnInit(): void {
    const tree = this.router.parseUrl(this.router.url);
    const fromRoute = tree.queryParamMap.get('q');
    if (fromRoute && !this.value()) {
      this.value.set(fromRoute);
    }
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  @HostListener('document:keydown', ['$event'])
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.open()) {
      event.preventDefault();
      this.closeDropdown();
    }
  }

  @HostListener('document:mousedown', ['$event'])
  protected onDocumentMouseDown(event: MouseEvent): void {
    const root = this.root()?.nativeElement;
    if (root && !root.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }

  protected onInput(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    this.value.set(next);
    this.activeIndex.set(-1);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      void this.loadSuggestions(next);
    }, 220);
  }

  protected onFocus(): void {
    this.open.set(true);
    void this.loadSuggestions(this.value());
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    const term = this.value().trim();
    const active = this.suggestions()[this.activeIndex()];

    if (active) {
      this.navigateSuggestion(active);
      return;
    }

    this.navigateToSearch(term);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.open()) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.open.set(true);
        void this.loadSuggestions(this.value());
      }
      return;
    }

    const items = this.suggestions();
    if (!items.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update((index) => (index + 1) % items.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update((index) => (index <= 0 ? items.length - 1 : index - 1));
      return;
    }

    if (event.key === 'Enter') {
      const active = items[this.activeIndex()];
      if (active) {
        event.preventDefault();
        this.navigateSuggestion(active);
      }
    }
  }

  protected onSuggestionMouseEnter(index: number): void {
    this.activeIndex.set(index);
  }

  protected onSuggestionClick(suggestion: StorefrontSearchSuggestion): void {
    this.navigateSuggestion(suggestion);
  }

  protected highlight(label: string, term: string): string {
    const normalized = term.trim();
    if (!normalized) {
      return this.escapeHtml(label);
    }

    const pattern = new RegExp(`(${this.escapeRegExp(normalized)})`, 'ig');
    return this.escapeHtml(label).replace(pattern, '<mark>$1</mark>');
  }

  protected suggestionIcon(type: StorefrontSearchSuggestion['type']): string {
    switch (type) {
      case 'category':
        return 'pi pi-tags';
      case 'recent':
        return 'pi pi-history';
      default:
        return 'pi pi-box';
    }
  }

  private async loadSuggestions(term: string): Promise<void> {
    const request = ++this.requestId;
    this.loading.set(true);
    this.open.set(true);

    try {
      const results = await this.searchService.getSuggestions(term);
      if (request !== this.requestId) {
        return;
      }

      this.suggestions.set(results);
      this.activeIndex.set(results.length ? 0 : -1);
    } finally {
      if (request === this.requestId) {
        this.loading.set(false);
      }
    }
  }

  private navigateSuggestion(suggestion: StorefrontSearchSuggestion): void {
    if (suggestion.type === 'product') {
      void this.router.navigateByUrl(suggestion.route);
    } else {
      const term = suggestion.searchTerm ?? suggestion.label;
      this.navigateToSearch(term);
      return;
    }

    this.closeDropdown();
    this.submitted.emit();
  }

  private navigateToSearch(term: string): void {
    if (term) {
      this.searchService.rememberSearch(term);
    }

    void this.router.navigate(['/products'], {
      queryParams: term ? { q: term } : {},
    });

    this.closeDropdown();
    this.submitted.emit();
  }

  private closeDropdown(): void {
    this.open.set(false);
    this.activeIndex.set(-1);
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
