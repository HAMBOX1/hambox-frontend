import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ElementRef, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTranslateService, TranslatePipe } from '@ngx-translate/core';

import { AssistantFacade } from '../../services/assistant.facade';
import { AssistantComposerComponent } from '../assistant-composer/assistant-composer.component';
import { AssistantHistoryComponent } from '../assistant-history/assistant-history.component';
import { AssistantMessageComponent } from '../assistant-message/assistant-message.component';
import { AssistantWidgetComponent } from './assistant-widget.component';

const STORAGE_KEY = 'hambox.assistant.fab';

class FakeAssistantFacade {
  readonly isOpen = signal(false);
  readonly isCollapsed = signal(false);
  readonly isHistoryOpen = signal(false);
  readonly hasNewSuggestion = signal(false);
  readonly showContextBanner = signal(false);
  readonly contextProductName = signal('');
  readonly contextProductId = signal<string | null>(null);
  readonly historyLoading = signal(false);
  readonly isThinking = signal(false);
  readonly messages = signal<readonly unknown[]>([]);
  readonly streamingMessage = signal<unknown>(null);
  readonly greetingName = signal('');
  readonly userInitial = signal('U');

  readonly open = vi.fn(() => this.isOpen.set(true));
  readonly close = vi.fn(() => this.isOpen.set(false));
  readonly closeHistory = vi.fn();
  readonly openHistory = vi.fn();
  readonly toggleCollapse = vi.fn();
  readonly startNewConversation = vi.fn();
  readonly selectSuggestion = vi.fn();
  readonly dismissContext = vi.fn();
  readonly createTicket = vi.fn();
  readonly regenerate = vi.fn();
  readonly retry = vi.fn();
  readonly toggleLike = vi.fn();
  readonly toggleDislike = vi.fn();
}

function pointer(type: string, x: number, y: number): PointerEvent {
  return new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true, button: 0 });
}

describe('AssistantWidgetComponent floating button', () => {
  let fixture: ComponentFixture<AssistantWidgetComponent>;
  let facade: FakeAssistantFacade;

  function create(): void {
    fixture = TestBed.createComponent(AssistantWidgetComponent);
    fixture.detectChanges();
  }

  const root = () => fixture.nativeElement as HTMLElement;
  const wrap = () => root().querySelector<HTMLElement>('.fab-wrap')!;
  const edge = () => root().querySelector<HTMLElement>('.fab-edge');

  beforeEach(() => {
    // The stubbed-out composer resolves to a bare ElementRef; opening the assistant then tries to focus it.
    (ElementRef.prototype as unknown as { focus: () => void }).focus = () => undefined;
    localStorage.removeItem(STORAGE_KEY);
    facade = new FakeAssistantFacade();
    TestBed.configureTestingModule({
      imports: [AssistantWidgetComponent],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: AssistantFacade, useValue: facade },
      ],
    });
    // Only the floating button is under test; the panel's child components need much more of the facade.
    TestBed.overrideComponent(AssistantWidgetComponent, {
      remove: { imports: [AssistantMessageComponent, AssistantHistoryComponent, AssistantComposerComponent] },
      add: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
    });
  });

  afterEach(() => {
    delete (ElementRef.prototype as unknown as { focus?: () => void }).focus;
    localStorage.removeItem(STORAGE_KEY);
  });

  it('shows the floating button and no edge tab by default', () => {
    create();

    expect(wrap().classList.contains('hidden')).toBe(false);
    expect(edge()).toBeNull();
  });

  it('tucks the button into the edge tab and brings it back, remembering the choice', () => {
    create();

    root().querySelector<HTMLButtonElement>('.fab-hide')!.click();
    fixture.detectChanges();

    expect(wrap().classList.contains('hidden')).toBe(true);
    expect(edge()).not.toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).docked).toBe(true);

    edge()!.click();
    fixture.detectChanges();

    expect(wrap().classList.contains('hidden')).toBe(false);
    expect(edge()).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).docked).toBe(false);
  });

  it('restores a docked button after a reload', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pos: { x: 20, y: 300 }, docked: true }));

    create();

    expect(wrap().classList.contains('hidden')).toBe(true);
    expect(edge()).not.toBeNull();
  });

  it('opens the assistant on a plain tap', () => {
    create();

    root().querySelector<HTMLButtonElement>('.fab')!.click();

    expect(facade.open).toHaveBeenCalledOnce();
  });

  it('moves with a drag, keeps its position, and does not open the assistant', () => {
    create();
    const fab = root().querySelector<HTMLButtonElement>('.fab')!;
    fab.setPointerCapture = vi.fn();
    fab.releasePointerCapture = vi.fn();
    vi.spyOn(wrap(), 'getBoundingClientRect').mockReturnValue({ left: 300, top: 500 } as DOMRect);

    fab.dispatchEvent(pointer('pointerdown', 330, 530));
    fab.dispatchEvent(pointer('pointermove', 280, 430));
    fab.dispatchEvent(pointer('pointerup', 280, 430));
    fab.click();
    fixture.detectChanges();

    expect(facade.open).not.toHaveBeenCalled();
    expect(wrap().classList.contains('fab-wrap--custom')).toBe(true);
    expect(wrap().style.left).toBe('250px');
    expect(wrap().style.top).toBe('400px');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).pos).toEqual({ x: 250, y: 400 });
  });

  it('treats a tiny movement as a tap, not a drag', () => {
    create();
    const fab = root().querySelector<HTMLButtonElement>('.fab')!;
    fab.setPointerCapture = vi.fn();
    fab.releasePointerCapture = vi.fn();
    vi.spyOn(wrap(), 'getBoundingClientRect').mockReturnValue({ left: 300, top: 500 } as DOMRect);

    fab.dispatchEvent(pointer('pointerdown', 330, 530));
    fab.dispatchEvent(pointer('pointermove', 332, 531));
    fab.dispatchEvent(pointer('pointerup', 332, 531));
    fab.click();

    expect(facade.open).toHaveBeenCalledOnce();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
