# Supplier Fulfillment Admin UI — Implementation Plan

## Audit summary

- **Product variant editor**: `features/catalog/components/product-variant-manager` drives a per-variant "codes dialog" (mobile `p-drawer`, desktop `p-dialog`, both instances render `<app-variant-inventory-panel />` for `selectedVariantForCodes()`). No existing tab system inside that dialog — it's a single stacked-sections view. This is the natural place to add a `Fulfillment` section as a sibling to `variant-inventory-panel`, matching the requested hierarchy (Variant info → Pricing → Inventory → Fulfillment).
- **Variant state**: `ProductEditorFacade` (`features/catalog/services/product-editor.facade.ts`) owns `variants`, `selectedVariant`, `selectedVariantId`, and `updateVariant()` (calls `InventoryApiService.updateVariant` → `reloadInventory` → `selectVariant`). I'll add `setVariantFulfillmentMode()` following the exact same pattern.
- **Supplier admin**: `features/admin/suppliers` already has a complete facade (`SuppliersManagementFacade`) + models + list/detail/mappings pages, wired to `SUPPLIERS_API`. `SupplierMappingDto`/`CreateSupplierMappingRequest` (frontend) don't yet have `internalProductVariantId` even though the backend already returns/accepts it (Phase 2) — needs adding.
- **Design system**: `AdminSectionCardComponent` (title+description card), `AdminStatusBadgeComponent` (tone: neutral/success/info/warning/danger), `AdminEmptyStateComponent`, `AdminConfirmDialogComponent`, `AdminLoadingSkeletonComponent` — all reused, no new primitives created. `product-health-panel` is the closest existing precedent for a checklist/readiness display.
- **Reordering**: `@angular/cdk/drag-drop` (`CdkDragDrop`, `moveItemInArray`) is already used for option-group reordering (`product-option-groups-panel`) — reusing the identical pattern for supplier-mapping priority reordering, calling the **existing** `SuppliersManagementFacade.updateMapping()` per changed row (no bulk-reorder endpoint exists or is needed).
- **Permissions**: `PERMISSIONS.Catalog.Inventory.Edit/.View` and `PERMISSIONS.Suppliers.*` already match backend exactly — no new permission added anywhere.
- **i18n**: `ADMIN.SUPPLIERS.*` and `ADMIN.INVENTORY_PANEL.*` namespaces already exist in `en.json`/`ar.json`. Adding a new `ADMIN.FULFILLMENT.*` namespace (cross-cutting between Catalog and Suppliers, mirrors how `PICKERS` already gets its own top-level namespace) plus a `FULFILLMENT` sub-key under `ADMIN.SUPPLIERS.MAPPINGS` for the chain/scope additions.
- **Error handling**: every facade already follows the same `toErrorMessage(error, fallback)` pattern (checks `ApiError`, maps 401/403 to a friendly message) — reused as-is, no new mechanism.

## Missing backend contract — one small, necessary addition

Two UI requirements (readiness display, and the "fulfillment chain" list of *all* eligible suppliers for a product/variant across suppliers) have no existing endpoint:
- `IFulfillmentRouter.GetReadinessAsync` is a Commerce-internal Application service, never exposed via HTTP.
- Existing supplier-mapping endpoints are scoped **by supplier** (`GET /suppliers/{id}/mappings`), not by product/variant across suppliers.

Adding **one** new read-only endpoint, entirely inside the Suppliers module (no Catalog/Commerce/payment/Bamboo code touched):

```
GET /api/v1/suppliers/fulfillment-chain?productId={id}&variantId={id?}
```

Reuses the exact same variant-precedence + priority-ordering resolution `FulfillmentRouter.ResolveSupplierCandidateAsync` already implements (duplicated here only because Suppliers cannot reference Commerce), returns **every** eligible mapping (not just the winner) with safe-only metadata:

```csharp
public sealed record SupplierFulfillmentChainCandidateDto(
    Guid MappingId, Guid SupplierId, string SupplierName, string ProviderType,
    string Scope,                 // "VariantSpecific" | "ProductWide"
    string ExternalProductId, int Priority, string MappingStatus,
    bool SupplierEnabled, bool CredentialsConfigured, bool ProviderRegistered, bool IsReady);
```

Gated by `PermissionConstants.Catalog.Inventory.View` (not `Suppliers.View`) — deliberate: this data is consumed from the Catalog product editor, contains nothing beyond what section B/F already classify as safe, and a Catalog-permission admin should be able to see *why* a variant's fulfillment isn't ready without needing separate Suppliers-module access. `FulfillmentMode`/`ManualAllowed` are **not** part of this DTO — the frontend already has `FulfillmentMode` from the existing variant DTO and derives `ManualAllowed` from it locally (pure function, no backend round-trip needed).

## Files to create (backend)

- `Suppliers.Application/Features/Suppliers/GetSupplierFulfillmentChainQuery.cs` (query + handler + DTO)
- Endpoint mapping added to existing `SupplierEndpoints.cs`

## Files to create (frontend)

- `features/catalog/components/variant-fulfillment-panel/variant-fulfillment-panel.component.{ts,html,scss}` — the new per-variant Fulfillment section (mode selector cards + readiness + chain list), mirrors `variant-inventory-panel`'s structure/imports exactly.
- `features/catalog/components/variant-fulfillment-panel/variant-fulfillment-panel.component.spec.ts`
- `features/admin/suppliers/components/fulfillment-chain-list/fulfillment-chain-list.component.{ts,html,scss}` — reusable ordered-chain display (scope badge, priority, readiness) shared between the Catalog variant panel and (optionally) the Suppliers mapping page.
- `features/admin/suppliers/components/fulfillment-chain-list/fulfillment-chain-list.component.spec.ts`

## Files to modify

**Backend:**
- `SupplierHandlers.cs` — add `GetSupplierFulfillmentChainQueryHandler`
- `SupplierEndpoints.cs` — add the GET route

**Frontend:**
- `core/api/api-endpoints.ts` — add `INVENTORY_API.variantFulfillmentMode(variantId)` and `SUPPLIERS_API.fulfillmentChain(productId, variantId?)`
- `features/catalog/models/inventory-api.model.ts` — add `fulfillmentMode: string` to `ProductVariantDto`, add `SetVariantFulfillmentModeRequest`
- `features/catalog/services/inventory-api.service.ts` — add `setVariantFulfillmentMode()`
- `features/catalog/services/product-editor.facade.ts` — add `setVariantFulfillmentMode()` (mirrors `updateVariant()`)
- `features/admin/suppliers/models/supplier.model.ts` — add `internalProductVariantId` to `SupplierMappingDto`/`CreateSupplierMappingRequest`; add `FulfillmentChainCandidateDto`
- `features/admin/suppliers/services/suppliers-management.facade.ts` — add `loadFulfillmentChain()` + reorder-priority helper
- `features/catalog/components/product-variant-manager/product-variant-manager.component.html` — add `<app-variant-fulfillment-panel />` after `<app-variant-inventory-panel />` in both drawer and dialog instances
- `features/admin/suppliers/pages/supplier-mappings-page/*` — show scope (variant-specific vs product-wide) badge on each row, since the existing page is supplier-scoped and already close to what section C wants for a single supplier's own mapping list
- `public/assets/i18n/en.json` / `ar.json` — new `ADMIN.FULFILLMENT.*` namespace + `ADMIN.SUPPLIERS.MAPPINGS.SCOPE_*` keys

## API contracts reused (no changes)

`INVENTORY_API.productVariants`, `INVENTORY_API.variant`, `SUPPLIERS_API.mappings/mapping`, `SuppliersManagementFacade.updateMapping/loadMappings`, `ApiClientService`, `ApiError`, `HasPermissionDirective`, `hamboxHasPermission` structural directive, `AdminConfirmDialogComponent`.

## UI states

Loading (`AdminLoadingSkeletonComponent`), empty (`AdminEmptyStateComponent` — "no eligible supplier configured"), error (`AdminErrorAlertComponent` / inline `toErrorMessage`), saving (disable mode cards + show spinner on the sticky/inline save affordance, mirroring `variant-inventory-panel`'s existing saving-state pattern), confirmation (`AdminConfirmDialogComponent`) only for the two materially-dangerous transitions (`ManualOnly↔SupplierOnly`, and dropping out of any `*First` mode's dual-source safety net into a single-source-only mode).

## Localization

All new strings added to both `en.json` and `ar.json` under `ADMIN.FULFILLMENT.*`. RTL verified via existing logical-property conventions (no new `margin-left/right` introduced).

## Tests

Vitest specs for `variant-fulfillment-panel` (4 modes render, selected mode highlighted, readiness ✓/⚠/✕ display, disabled-supplier row styling, variant-specific-vs-product-wide badge, save invokes facade method, permission-gated controls hidden for read-only, error mapped safely, no credential fields rendered anywhere) and `fulfillment-chain-list` (priority ordering, scope badge). Existing baseline test health checked before touching anything (per instruction, not repairing unrelated failures).
