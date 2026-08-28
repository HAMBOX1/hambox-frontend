import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { provideApiTestBed } from '../../../../../testing/common-test.providers';
import { SupplierDetailPageComponent } from './supplier-detail-page.component';

/** `form` and the `shows*`/lock-down signals are `protected` (template-only by convention) — this test accesses the internals deliberately via `any` rather than loosening the component's public API just for testing. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function internals(component: SupplierDetailPageComponent): any {
  return component;
}

/** Lets pending promise chains (facade calls, `.then()` continuations) settle without `fakeAsync`. */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function baseProviders(routeParams: Record<string, string>) {
  return [
    provideApiTestBed(),
    provideHttpClientTesting(),
    provideTranslateService({ lang: 'en', fallbackLang: 'en' }),
    { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
    { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(routeParams) } } },
  ];
}

/**
 * Focused on the provider-aware lock-down logic (Base URL/Authentication Type/capabilities locking for
 * Bamboo) and the Bamboo Default Account ID flow — which must work identically in create and edit mode
 * (Account ID is required and validated in both; only *where* it's persisted differs, since Settings can
 * only be written via the id-keyed endpoint, so a brand-new supplier's Account ID is saved with one
 * follow-up call right after creation succeeds, still within the same submit action).
 */
describe('SupplierDetailPageComponent — create mode', () => {
  let fixture: ComponentFixture<SupplierDetailPageComponent>;
  let httpMock: HttpTestingController;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let c: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupplierDetailPageComponent],
      providers: baseProviders({}), // no :id -> create mode, no detail HTTP fetch
    }).compileComponents();

    fixture = TestBed.createComponent(SupplierDetailPageComponent);
    httpMock = TestBed.inject(HttpTestingController);
    c = internals(fixture.componentInstance);
    fixture.detectChanges();
  });

  function fillMinimalBambooForm(): void {
    c.form.controls.name.setValue('Bamboo');
    c.form.controls.code.setValue('BAMBOO');
    c.form.controls.providerType.setValue('Bamboo');
    c.form.controls.priority.setValue(100);
    fixture.detectChanges();
  }

  it('leaves Base URL, Authentication Type, and capabilities editable for a non-fixed provider', () => {
    c.form.controls.providerType.setValue('Manual');
    fixture.detectChanges();

    expect(c.form.controls.baseUrl.disabled).toBe(false);
    expect(c.form.controls.authenticationType.disabled).toBe(false);
    expect(c.form.controls.supportsInventorySync.disabled).toBe(false);
  });

  it('locks Base URL to the fixed Bamboo endpoint and disables editing', () => {
    c.form.controls.providerType.setValue('Bamboo');
    fixture.detectChanges();

    expect(c.form.controls.baseUrl.value).toBe('https://api.bamboocardportal.com');
    expect(c.form.controls.baseUrl.disabled).toBe(true);
  });

  it('forces Authentication Type to BasicAuth and disables it for Bamboo', () => {
    c.form.controls.authenticationType.setValue('BearerToken');
    c.form.controls.providerType.setValue('Bamboo');
    fixture.detectChanges();

    expect(c.form.controls.authenticationType.value).toBe('BasicAuth');
    expect(c.form.controls.authenticationType.disabled).toBe(true);
  });

  it('disables and unchecks capabilities Bamboo does not support, but leaves order status editable', () => {
    c.form.controls.supportsInventorySync.setValue(true);
    c.form.controls.providerType.setValue('Bamboo');
    fixture.detectChanges();

    expect(c.form.controls.supportsInventorySync.value).toBe(false);
    expect(c.form.controls.supportsInventorySync.disabled).toBe(true);
    expect(c.form.controls.supportsPriceSync.disabled).toBe(true);
    expect(c.form.controls.supportsReservations.disabled).toBe(true);
    expect(c.form.controls.supportsWebhooks.disabled).toBe(true);
    expect(c.form.controls.supportsOrderStatus.disabled).toBe(false);
  });

  it('defaults Order Status on for a brand-new Bamboo supplier without overriding an explicit choice', () => {
    c.form.controls.providerType.setValue('Bamboo');
    fixture.detectChanges();
    expect(c.form.controls.supportsOrderStatus.value).toBe(true);
  });

  it('re-enables every locked field when switching away from Bamboo', () => {
    c.form.controls.providerType.setValue('Bamboo');
    fixture.detectChanges();

    c.form.controls.providerType.setValue('Manual');
    fixture.detectChanges();

    expect(c.form.controls.baseUrl.disabled).toBe(false);
    expect(c.form.controls.authenticationType.disabled).toBe(false);
    expect(c.form.controls.supportsInventorySync.disabled).toBe(false);
  });

  it('locks Base URL and forces BearerToken auth for Visoria, and locks the same capabilities as Bamboo', () => {
    c.form.controls.authenticationType.setValue('ApiKey');
    c.form.controls.providerType.setValue('Visoria');
    fixture.detectChanges();

    expect(c.form.controls.baseUrl.value).toBe('https://api.visoria.digital');
    expect(c.form.controls.baseUrl.disabled).toBe(true);
    expect(c.form.controls.authenticationType.value).toBe('BearerToken');
    expect(c.form.controls.authenticationType.disabled).toBe(true);
    expect(c.form.controls.supportsInventorySync.disabled).toBe(true);
    expect(c.form.controls.supportsPriceSync.disabled).toBe(true);
    expect(c.form.controls.supportsReservations.disabled).toBe(true);
    expect(c.form.controls.supportsWebhooks.disabled).toBe(true);
    expect(c.form.controls.supportsOrderStatus.disabled).toBe(false);
    expect(c.form.controls.supportsOrderStatus.value).toBe(true);
  });

  it('locks Base URL to the Eneba Sandbox host and forces OAuth2 auth, and locks the same capabilities as Bamboo/Visoria/GlobeTopper', () => {
    c.form.controls.authenticationType.setValue('ApiKey');
    c.form.controls.providerType.setValue('Eneba');
    fixture.detectChanges();

    expect(c.form.controls.baseUrl.value).toBe('https://api-sandbox.eneba.com');
    expect(c.form.controls.baseUrl.disabled).toBe(true);
    expect(c.form.controls.authenticationType.value).toBe('OAuth2');
    expect(c.form.controls.authenticationType.disabled).toBe(true);
    expect(c.form.controls.supportsInventorySync.disabled).toBe(true);
    expect(c.form.controls.supportsPriceSync.disabled).toBe(true);
    expect(c.form.controls.supportsReservations.disabled).toBe(true);
    expect(c.form.controls.supportsWebhooks.disabled).toBe(true);
    expect(c.form.controls.supportsOrderStatus.disabled).toBe(false);
    expect(c.form.controls.supportsOrderStatus.value).toBe(true);
  });

  it('shows the Client ID / Client Secret pair only for BasicAuth, never Username/Password', () => {
    c.form.controls.authenticationType.setValue('BasicAuth');
    fixture.detectChanges();
    expect(c.showsApiKeyPair()).toBe(true);

    c.form.controls.authenticationType.setValue('BearerToken');
    fixture.detectChanges();
    expect(c.showsApiKeyPair()).toBe(false);
    expect(c.showsBearerToken()).toBe(true);
  });

  it('shows no credential fields for AuthenticationType "None"', () => {
    c.form.controls.authenticationType.setValue('None');
    fixture.detectChanges();

    expect(c.showsNoCredentials()).toBe(true);
    expect(c.showsApiKeyPair()).toBe(false);
    expect(c.showsBearerToken()).toBe(false);
    expect(c.showsOAuthSettings()).toBe(false);
  });

  // A. New Bamboo supplier with a valid Account ID -> save() calls createSupplier(), then persists
  // SettingsJson via the follow-up settings PUT, all within the same submit — before navigation.
  it('A: creates a Bamboo supplier and persists its Account ID via the follow-up settings PUT', async () => {
    fillMinimalBambooForm();
    c.bambooAccountIdControl.setValue(777);
    fixture.detectChanges();

    const savePromise: Promise<void> = c.save();
    const newId = '11111111-1111-1111-1111-111111111111';

    const createReq = httpMock.expectOne((req) => req.method === 'POST' && req.url === '/api/v1/suppliers');
    expect(createReq.request.body).toEqual(
      expect.objectContaining({ name: 'Bamboo', code: 'BAMBOO', providerType: 'Bamboo', authenticationType: 'BasicAuth', priority: 100 }),
    );
    createReq.flush(newId);
    await flushMicrotasks();

    // G. SettingsJson must contain a numeric accountId after create.
    const settingsReq = httpMock.expectOne((req) => req.method === 'PUT' && req.url === `/api/v1/suppliers/${newId}/settings`);
    expect(JSON.parse(settingsReq.request.body.settingsJson)).toEqual({ accountId: 777 });
    settingsReq.flush(null);
    await flushMicrotasks();

    // facade.updateSettings -> runSave() reloads the detail (GET) after a successful PUT, same as
    // every other save path in this facade — must be satisfied before save()'s promise resolves.
    httpMock.expectOne((req) => req.method === 'GET' && req.url === `/api/v1/suppliers/${newId}`).flush({
      id: newId,
      name: 'Bamboo',
      code: 'BAMBOO',
      providerType: 'Bamboo',
      status: 'Active',
      priority: 100,
      baseUrl: 'https://api.bamboocardportal.com',
      authenticationType: 'BasicAuth',
      settingsJson: '{"accountId":777}',
      username: null,
      hasApiKey: false,
      hasApiSecret: false,
      hasPassword: false,
      hasBearerToken: false,
      hasOAuthSettings: false,
      supportsInventorySync: false,
      supportsPriceSync: false,
      supportsReservations: false,
      supportsOrderStatus: true,
      supportsWebhooks: false,
      isEnabled: true,
      createdOnUtc: '2026-08-01T00:00:00Z',
      modifiedOnUtc: null,
    });

    await savePromise;
    expect(c.settingsJsonError()).toBeNull();
  });

  // B. Missing Account ID -> visible validation error, no HTTP call at all.
  it('B: blocks Create Supplier with a visible error when Account ID is missing, and makes no HTTP call', async () => {
    fillMinimalBambooForm(); // bambooAccountIdControl left untouched (null)

    await c.save();

    httpMock.expectNone((req) => req.method === 'POST' && req.url === '/api/v1/suppliers');
    expect(c.settingsJsonError()).toBe('ADMIN.SUPPLIERS.DETAIL.ACCOUNT_ID_REQUIRED');
  });

  // C. Account ID = 0 -> same as missing: blocked, visible error, no HTTP call.
  it('C: blocks Create Supplier with a visible error when Account ID is 0, and makes no HTTP call', async () => {
    fillMinimalBambooForm();
    c.bambooAccountIdControl.setValue(0);
    fixture.detectChanges();

    await c.save();

    httpMock.expectNone((req) => req.method === 'POST' && req.url === '/api/v1/suppliers');
    expect(c.settingsJsonError()).toBe('ADMIN.SUPPLIERS.DETAIL.ACCOUNT_ID_REQUIRED');
  });

  // D. Non-Bamboo provider -> Account ID validation never applies; create proceeds with no Account ID.
  it('D: Account ID validation does not apply to a non-Bamboo supplier', async () => {
    c.form.controls.name.setValue('Acme Codes');
    c.form.controls.code.setValue('ACME');
    c.form.controls.providerType.setValue('Manual');
    c.form.controls.priority.setValue(100);
    fixture.detectChanges();

    expect(c.bambooAccountIdControl.value).toBeNull();

    const savePromise: Promise<void> = c.save();

    const createReq = httpMock.expectOne((req) => req.method === 'POST' && req.url === '/api/v1/suppliers');
    createReq.flush('22222222-2222-2222-2222-222222222222');
    await flushMicrotasks();

    httpMock.expectNone((req) => req.method === 'PUT' && req.url.endsWith('/settings'));
    await savePromise;
    expect(c.settingsJsonError()).toBeNull();
  });
});

describe('SupplierDetailPageComponent — edit mode (existing Bamboo supplier)', () => {
  const supplierId = '33333333-3333-3333-3333-333333333333';
  let fixture: ComponentFixture<SupplierDetailPageComponent>;
  let httpMock: HttpTestingController;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let c: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupplierDetailPageComponent],
      providers: baseProviders({ id: supplierId }),
    }).compileComponents();

    fixture = TestBed.createComponent(SupplierDetailPageComponent);
    httpMock = TestBed.inject(HttpTestingController);
    c = internals(fixture.componentInstance);
    fixture.detectChanges(); // triggers ngOnInit -> loadProviderTypes GET + loadDetail GET

    httpMock.expectOne((req) => req.method === 'GET' && req.url === '/api/v1/suppliers/provider-types').flush([]);
    httpMock.expectOne((req) => req.method === 'GET' && req.url === `/api/v1/suppliers/${supplierId}`).flush({
      id: supplierId,
      name: 'Bamboo',
      code: 'BAMBOO',
      providerType: 'Bamboo',
      status: 'Active',
      priority: 100,
      baseUrl: 'https://api.bamboocardportal.com',
      authenticationType: 'BasicAuth',
      settingsJson: '{"accountId":555}',
      username: null,
      hasApiKey: true,
      hasApiSecret: true,
      hasPassword: false,
      hasBearerToken: false,
      hasOAuthSettings: false,
      supportsInventorySync: false,
      supportsPriceSync: false,
      supportsReservations: false,
      supportsOrderStatus: true,
      supportsWebhooks: false,
      isEnabled: true,
      createdOnUtc: '2026-08-01T00:00:00Z',
      modifiedOnUtc: null,
    });
    await flushMicrotasks();
    fixture.detectChanges();
  });

  // E. Existing Bamboo supplier loads its Account ID from SettingsJson on load.
  it('E: loads Account ID from the supplier\'s SettingsJson', () => {
    expect(c.bambooAccountIdControl.value).toBe(555);
  });

  // F. Existing Bamboo supplier: admin can change the Account ID and save it.
  it('F: updates the Account ID via the settings PUT when the admin changes it', async () => {
    c.bambooAccountIdControl.setValue(999);
    fixture.detectChanges();

    const savePromise: Promise<void> = c.save();

    // save()'s edit branch: PUT the supplier, then facade.updateSupplier's own runSave() reloads the
    // detail (GET) before resolving `success` — only after that does save() call saveSettingsIfChanged.
    const updateReq = httpMock.expectOne((req) => req.method === 'PUT' && req.url === `/api/v1/suppliers/${supplierId}`);
    updateReq.flush(null);
    await flushMicrotasks();

    httpMock.expectOne((req) => req.method === 'GET' && req.url === `/api/v1/suppliers/${supplierId}`).flush({
      id: supplierId,
      name: 'Bamboo',
      code: 'BAMBOO',
      providerType: 'Bamboo',
      status: 'Active',
      priority: 100,
      baseUrl: 'https://api.bamboocardportal.com',
      authenticationType: 'BasicAuth',
      settingsJson: '{"accountId":555}', // still the old value — this GET reload happens before the settings PUT
      username: null,
      hasApiKey: true,
      hasApiSecret: true,
      hasPassword: false,
      hasBearerToken: false,
      hasOAuthSettings: false,
      supportsInventorySync: false,
      supportsPriceSync: false,
      supportsReservations: false,
      supportsOrderStatus: true,
      supportsWebhooks: false,
      isEnabled: true,
      createdOnUtc: '2026-08-01T00:00:00Z',
      modifiedOnUtc: null,
    });
    await flushMicrotasks();

    // G. SettingsJson must contain the updated numeric accountId.
    const settingsReq = httpMock.expectOne((req) => req.method === 'PUT' && req.url === `/api/v1/suppliers/${supplierId}/settings`);
    expect(JSON.parse(settingsReq.request.body.settingsJson)).toEqual({ accountId: 999 });
    settingsReq.flush(null);
    await flushMicrotasks();

    // facade.updateSettings -> runSave() reloads the detail a second time after its own successful PUT.
    httpMock.expectOne((req) => req.method === 'GET' && req.url === `/api/v1/suppliers/${supplierId}`).flush({
      id: supplierId,
      name: 'Bamboo',
      code: 'BAMBOO',
      providerType: 'Bamboo',
      status: 'Active',
      priority: 100,
      baseUrl: 'https://api.bamboocardportal.com',
      authenticationType: 'BasicAuth',
      settingsJson: '{"accountId":999}',
      username: null,
      hasApiKey: true,
      hasApiSecret: true,
      hasPassword: false,
      hasBearerToken: false,
      hasOAuthSettings: false,
      supportsInventorySync: false,
      supportsPriceSync: false,
      supportsReservations: false,
      supportsOrderStatus: true,
      supportsWebhooks: false,
      isEnabled: true,
      createdOnUtc: '2026-08-01T00:00:00Z',
      modifiedOnUtc: null,
    });

    await savePromise;
    expect(c.settingsJsonError()).toBeNull();
  });

  it('blocks Save with a visible error when the admin clears the Account ID', async () => {
    c.bambooAccountIdControl.setValue(null);
    fixture.detectChanges();

    await c.save();

    httpMock.expectNone((req) => req.method === 'PUT' && req.url === `/api/v1/suppliers/${supplierId}`);
    expect(c.settingsJsonError()).toBe('ADMIN.SUPPLIERS.DETAIL.ACCOUNT_ID_REQUIRED');
  });
});
