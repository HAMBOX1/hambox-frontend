import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';
import { ConsoleFavoritesSectionConfig } from '../../section-registry/models/section-config.model';

interface CardVisualState {
  readonly tx: string;
  readonly rot: string;
  readonly scale: number;
  readonly opacity: number;
  readonly zIndex: number;
  readonly interactive: boolean;
}

const PEEK_STEP_PX = 132;
const HIDDEN_STEP_PX = 90;
const ROTATE_DEG = 8;
const SIDE_SCALE = 0.82;
const HIDDEN_SCALE_STEP = 0.16;
const SIDE_OPACITY = 0.55;

/**
 * A layered "fanned collectible" carousel — not a scroll row. Every card is absolutely positioned
 * at the stack's center; a card's on-screen offset/rotation/scale/opacity/z-index are purely a
 * function of its signed circular distance from `activeIndex`, so paging is just changing one
 * number and letting CSS transitions animate every card to its new slot at once (center → side,
 * side → center, others fade out) — the "physically moving cards" effect the design calls for.
 */
@Component({
  selector: 'app-console-favorites-section',
  standalone: true,
  imports: [RouterLink, ScrollRevealDirective, TranslatePipe],
  templateUrl: './console-favorites-section.component.html',
  styleUrl: './console-favorites-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsoleFavoritesSectionComponent {
  readonly config = input.required<ConsoleFavoritesSectionConfig>();

  private readonly manualIndex = signal<number | null>(null);
  private dragStartX: number | null = null;
  private dragPointerId: number | null = null;
  protected suppressNextClick = false;

  protected readonly activeIndex = computed(() => {
    const manual = this.manualIndex();
    if (manual !== null) {
      return manual;
    }
    const cards = this.config().cards;
    const featuredIndex = cards.findIndex((card) => card.featured);
    return featuredIndex >= 0 ? featuredIndex : 0;
  });

  protected next(): void {
    this.goTo(this.activeIndex() + 1);
  }

  protected prev(): void {
    this.goTo(this.activeIndex() - 1);
  }

  protected goTo(index: number): void {
    const total = this.config().cards.length;
    if (!total) {
      return;
    }
    this.manualIndex.set(((index % total) + total) % total);
  }

  /** Shortest signed circular distance from the active card — e.g. with 5 cards and active=0,
   * the last card reports -1 (it's one step to the left), not -4. */
  protected cardDelta(index: number): number {
    const total = this.config().cards.length;
    if (!total) {
      return 0;
    }
    let delta = index - this.activeIndex();
    if (delta > total / 2) {
      delta -= total;
    }
    if (delta < -total / 2) {
      delta += total;
    }
    return delta;
  }

  protected cardState(index: number): CardVisualState {
    const delta = this.cardDelta(index);
    const abs = Math.abs(delta);
    const sign = Math.sign(delta);

    if (abs === 0) {
      return { tx: '0px', rot: '0deg', scale: 1, opacity: 1, zIndex: 10, interactive: true };
    }
    if (abs === 1) {
      return {
        tx: `${sign * PEEK_STEP_PX}px`,
        rot: `${sign * ROTATE_DEG}deg`,
        scale: SIDE_SCALE,
        opacity: SIDE_OPACITY,
        zIndex: 9,
        interactive: true,
      };
    }
    const extra = Math.min(abs - 1, 3);
    return {
      tx: `${sign * (PEEK_STEP_PX + extra * HIDDEN_STEP_PX)}px`,
      rot: `${sign * ROTATE_DEG}deg`,
      scale: Math.max(0.4, SIDE_SCALE - extra * HIDDEN_SCALE_STEP),
      opacity: 0,
      zIndex: Math.max(1, 9 - extra),
      interactive: false,
    };
  }

  protected onCardClick(event: MouseEvent): void {
    if (this.suppressNextClick) {
      event.preventDefault();
      this.suppressNextClick = false;
    }
  }

  protected onPointerDown(event: PointerEvent): void {
    this.dragStartX = event.clientX;
    this.dragPointerId = event.pointerId;
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.dragStartX === null || event.pointerId !== this.dragPointerId) {
      return;
    }
    const dx = event.clientX - this.dragStartX;
    this.dragStartX = null;
    this.dragPointerId = null;

    const threshold = 48;
    if (dx <= -threshold) {
      this.suppressNextClick = true;
      this.next();
    } else if (dx >= threshold) {
      this.suppressNextClick = true;
      this.prev();
    }
  }

  protected onPointerCancel(): void {
    this.dragStartX = null;
    this.dragPointerId = null;
  }
}
