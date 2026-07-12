import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

import { AdminSectionCardComponent } from '../../../../../shared/components/admin';

@Component({
  selector: 'app-storefront-settings-editor',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    TextareaModule,
    AdminSectionCardComponent,
  ],
  templateUrl: './storefront-settings-editor.component.html',
  styleUrl: './storefront-settings-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontSettingsEditorComponent {
  readonly payload = input.required<Record<string, unknown>>();
  readonly disabled = input(false);
  readonly payloadChange = output<Record<string, unknown>>();

  protected section(key: string): Record<string, unknown> {
    const value = this.payload()[key];
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  protected trustItems(): Record<string, unknown>[] {
    const items = this.payload()['trustBar'];
    return Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
  }

  protected setSectionField(sectionKey: string, field: string, value: unknown): void {
    const next = structuredClone(this.payload()) as Record<string, unknown>;
    const section = {
      ...((next[sectionKey] as Record<string, unknown> | undefined) ?? {}),
      [field]: value,
    };
    next[sectionKey] = section;
    this.payloadChange.emit(next);
  }

  protected setTrustField(index: number, field: string, value: unknown): void {
    const next = structuredClone(this.payload()) as Record<string, unknown>;
    const items = Array.isArray(next['trustBar'])
      ? [...(next['trustBar'] as Record<string, unknown>[])]
      : [];
    items[index] = { ...items[index], [field]: value };
    next['trustBar'] = items;
    this.payloadChange.emit(next);
  }

  protected addTrustItem(): void {
    const next = structuredClone(this.payload()) as Record<string, unknown>;
    const items = Array.isArray(next['trustBar'])
      ? [...(next['trustBar'] as Record<string, unknown>[])]
      : [];
    items.push({
      id: `trust-${Date.now()}`,
      iconUrl: '/assets/images/trust/instant-delivery.svg',
      title: 'New trust item',
      description: '',
      sortOrder: items.length + 1,
      visible: true,
    });
    next['trustBar'] = items;
    this.payloadChange.emit(next);
  }

  protected removeTrustItem(index: number): void {
    const next = structuredClone(this.payload()) as Record<string, unknown>;
    const items = Array.isArray(next['trustBar'])
      ? [...(next['trustBar'] as Record<string, unknown>[])]
      : [];
    items.splice(index, 1);
    next['trustBar'] = items;
    this.payloadChange.emit(next);
  }

  protected text(sectionKey: string, field: string): string {
    const value = this.section(sectionKey)[field];
    return value == null ? '' : String(value);
  }

  protected bool(sectionKey: string, field: string): boolean {
    return Boolean(this.section(sectionKey)[field]);
  }

  protected num(sectionKey: string, field: string): number | null {
    const value = this.section(sectionKey)[field];
    return typeof value === 'number' ? value : value == null ? null : Number(value);
  }

  protected trustText(item: Record<string, unknown>, field: string): string {
    const value = item[field];
    return value == null ? '' : String(value);
  }

  protected trustBool(item: Record<string, unknown>, field: string): boolean {
    return Boolean(item[field]);
  }

  protected trustNum(item: Record<string, unknown>, field: string): number | null {
    const value = item[field];
    return typeof value === 'number' ? value : value == null ? null : Number(value);
  }
}
