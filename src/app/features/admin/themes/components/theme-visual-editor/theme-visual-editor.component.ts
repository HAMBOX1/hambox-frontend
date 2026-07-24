import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { SelectModule } from 'primeng/select';

import {
  THEME_SEMANTIC_TOKENS,
  THEME_TOKEN_SECTIONS,
  ThemeSemanticTokenKey,
  tokenLabelKey,
} from '../../../../../core/theme/theme-semantic-tokens';
import { AdminSectionCardComponent } from '../../../../../shared/components/admin';
import { UiColorPickerComponent } from '../../../../../shared/components/ui';
import { shadeRamp } from '../../../../../shared/utils/color.util';
import { ThemeTokenEditorComponent } from '../theme-token-editor/theme-token-editor.component';

const COLOR_TOKENS: readonly ThemeSemanticTokenKey[] = [
  THEME_SEMANTIC_TOKENS.Primary,
  THEME_SEMANTIC_TOKENS.Secondary,
  THEME_SEMANTIC_TOKENS.Accent,
  THEME_SEMANTIC_TOKENS.Success,
  THEME_SEMANTIC_TOKENS.Warning,
  THEME_SEMANTIC_TOKENS.Danger,
  THEME_SEMANTIC_TOKENS.Background,
  THEME_SEMANTIC_TOKENS.Surface,
  THEME_SEMANTIC_TOKENS.SurfaceElevation,
  THEME_SEMANTIC_TOKENS.Card,
  THEME_SEMANTIC_TOKENS.Border,
  THEME_SEMANTIC_TOKENS.Divider,
  THEME_SEMANTIC_TOKENS.Navbar,
  THEME_SEMANTIC_TOKENS.Sidebar,
  THEME_SEMANTIC_TOKENS.Footer,
];

const GOOGLE_FONTS = [
  'Inter',
  'Manrope',
  'Sora',
  'Poppins',
  'Roboto',
  'Montserrat',
  'Nunito',
  'Raleway',
  'Playfair Display',
  'Work Sans',
  'Rubik',
  'Space Grotesk',
  'Outfit',
  'Barlow',
  'Cairo',
] as const;

const RADIUS_TOKENS: readonly ThemeSemanticTokenKey[] = [
  THEME_SEMANTIC_TOKENS.ButtonRadius,
  THEME_SEMANTIC_TOKENS.InputRadius,
  THEME_SEMANTIC_TOKENS.BorderRadius,
];

type SectionId = 'brand' | 'typography' | 'surfaces' | 'layout' | 'buttons' | 'effects' | 'advanced';

interface SectionNavItem {
  readonly id: SectionId;
  readonly labelKey: string;
  readonly icon: string;
}

const SECTION_NAV: readonly SectionNavItem[] = [
  { id: 'brand', labelKey: 'ADMIN.THEMES.TOKENS.SECTIONS.BRAND', icon: 'pi pi-palette' },
  { id: 'typography', labelKey: 'ADMIN.THEMES.TOKENS.SECTIONS.TYPOGRAPHY', icon: 'pi pi-pencil' },
  { id: 'surfaces', labelKey: 'ADMIN.THEMES.TOKENS.SECTIONS.SURFACES', icon: 'pi pi-clone' },
  { id: 'layout', labelKey: 'ADMIN.THEMES.TOKENS.SECTIONS.LAYOUT', icon: 'pi pi-bars' },
  { id: 'buttons', labelKey: 'ADMIN.THEMES.TOKENS.SECTIONS.BUTTONS', icon: 'pi pi-stop' },
  { id: 'effects', labelKey: 'ADMIN.THEMES.TOKENS.SECTIONS.EFFECTS', icon: 'pi pi-sun' },
  { id: 'advanced', labelKey: 'ADMIN.THEMES.EDITOR.ADVANCED', icon: 'pi pi-code' },
];

const loadedFonts = new Set<string>();

@Component({
  selector: 'app-theme-visual-editor',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    SelectModule,
    AdminSectionCardComponent,
    UiColorPickerComponent,
    ThemeTokenEditorComponent,
  ],
  templateUrl: './theme-visual-editor.component.html',
  styleUrl: './theme-visual-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeVisualEditorComponent {
  readonly tokens = input.required<Readonly<Record<string, string>>>();
  readonly disabled = input(false);

  readonly tokensChange = output<Record<string, string>>();

  protected readonly sectionNav = SECTION_NAV;
  protected readonly activeSection = signal<SectionId>('brand');
  protected readonly fontOptions = GOOGLE_FONTS.map((name) => ({ label: name, value: name }));
  protected readonly colorTokens = COLOR_TOKENS;
  protected readonly radiusTokens = RADIUS_TOKENS;
  protected readonly tokenLabel = tokenLabelKey;

  protected readonly brandTokens = THEME_TOKEN_SECTIONS.find((s) => s.id === 'brand')!.tokens;
  protected readonly surfaceTokens = THEME_TOKEN_SECTIONS.find((s) => s.id === 'surfaces')!.tokens;
  protected readonly layoutTokens = THEME_TOKEN_SECTIONS.find((s) => s.id === 'layout')!.tokens;

  protected readonly primaryRamp = computed(() =>
    shadeRamp(this.tokens()[THEME_SEMANTIC_TOKENS.Primary] ?? '#000000'),
  );

  protected readonly selectedFont = computed(() => {
    const value = this.tokens()[THEME_SEMANTIC_TOKENS.Typography] ?? '';
    const match = GOOGLE_FONTS.find((font) => value.includes(font));
    return match ?? GOOGLE_FONTS[0];
  });

  protected readonly animationSpeed = computed(
    () => this.tokens()[THEME_SEMANTIC_TOKENS.AnimationSpeed] ?? '200ms',
  );
  protected readonly shadow = computed(() => this.tokens()[THEME_SEMANTIC_TOKENS.Shadow] ?? '');

  constructor() {
    effect(() => ensureGoogleFont(this.selectedFont()));
  }

  protected selectSection(id: SectionId): void {
    this.activeSection.set(id);
  }

  protected tokenValue(key: ThemeSemanticTokenKey): string {
    return this.tokens()[key] ?? '';
  }

  protected setToken(key: ThemeSemanticTokenKey, value: string): void {
    this.tokensChange.emit({ ...this.tokens(), [key]: value });
  }

  protected onFontChange(fontName: string): void {
    ensureGoogleFont(fontName);
    this.setToken(THEME_SEMANTIC_TOKENS.Typography, `'${fontName}', system-ui, sans-serif`);
  }

  protected radiusPixels(key: ThemeSemanticTokenKey): number {
    return this.parsePixels(this.tokenValue(key));
  }

  protected parsePixels(value: string): number {
    return parseInt(value, 10) || 0;
  }

  protected setRadiusPixels(key: ThemeSemanticTokenKey, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.setToken(key, `${value}px`);
  }

  protected setAnimationSpeed(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.setToken(THEME_SEMANTIC_TOKENS.AnimationSpeed, `${value}ms`);
  }

  protected onAdvancedTokensChange(next: Record<string, string>): void {
    this.tokensChange.emit(next);
  }
}

function ensureGoogleFont(fontName: string): void {
  if (loadedFonts.has(fontName) || typeof document === 'undefined') {
    return;
  }

  loadedFonts.add(fontName);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}
