import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { firstValueFrom } from 'rxjs';

import { ProductAssetFile, ProductImage } from '../../models/product.model';
import { ProductApiService } from '../../services/product-api.service';
import {
  isAllowedProductImage,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_MAX_COUNT,
  resolveProductImageUrl,
} from '../../utils/product-image.utils';

@Component({
  selector: 'app-product-assets-upload',
  standalone: true,
  imports: [ButtonModule, DragDropModule, DialogModule],
  templateUrl: './product-assets-upload.component.html',
  styleUrl: './product-assets-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductAssetsUploadComponent implements OnDestroy {
  private readonly productApi = inject(ProductApiService);

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly productId = input<string | null>(null);

  protected readonly maxCount = PRODUCT_IMAGE_MAX_COUNT;

  protected readonly assets = signal<readonly ProductAssetFile[]>([]);
  protected readonly isDragOver = signal(false);
  protected readonly uploading = signal(false);
  protected readonly validationError = signal<string | null>(null);
  protected readonly previewAsset = signal<ProductAssetFile | null>(null);

  private readonly previewUrls = new Set<string>();
  private readonly deletedImageIds = signal<ReadonlySet<string>>(new Set());
  private originalOrder: readonly string[] = [];
  private originalPrimaryId: string | null = null;

  /** True while there are local image changes (added/removed/reordered/re-primaried) not yet
   * pushed to the backend — driven into `onSave` alongside the General form, same as `dirty`
   * on `ProductBasicInfoFormComponent`. */
  readonly dirty = computed(() => {
    const assets = this.assets();
    if (assets.some((asset) => !asset.persisted)) {
      return true;
    }
    if (this.deletedImageIds().size > 0) {
      return true;
    }

    const currentOrder = assets.map((asset) => asset.id);
    if (currentOrder.length !== this.originalOrder.length || currentOrder.some((id, i) => id !== this.originalOrder[i])) {
      return true;
    }

    const currentPrimaryId = assets.find((asset) => asset.isPrimary)?.id ?? null;
    return currentPrimaryId !== this.originalPrimaryId;
  });

  constructor() {
    effect(() => {
      const productId = this.productId();
      // Skip when there are unsaved local staged images — e.g. the productId flips from null to
      // a freshly auto-created draft id while the admin still has un-uploaded files pending.
      if (!productId || this.dirty()) {
        return;
      }

      void this.refreshPersistedImages(productId);
    });
  }

  ngOnDestroy(): void {
    this.revokeAllPreviews();
  }

  openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  loadPersistedImages(images: readonly ProductImage[]): void {
    this.revokeAllPreviews();

    const sorted = [...images].sort((left, right) => left.displayOrder - right.displayOrder);

    this.assets.set(
      sorted.map((image) => ({
        id: image.id,
        name: image.fileName,
        size: image.fileSizeBytes,
        previewUrl: resolveProductImageUrl(image.url),
        persisted: true,
        isPrimary: image.isPrimary,
        contentType: image.contentType,
      })),
    );

    this.deletedImageIds.set(new Set());
    this.originalOrder = sorted.map((image) => image.id);
    this.originalPrimaryId = sorted.find((image) => image.isPrimary)?.id ?? null;
  }

  protected onBrowseClick(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  protected openPreview(asset: ProductAssetFile): void {
    this.previewAsset.set(asset);
  }

  protected closePreview(): void {
    this.previewAsset.set(null);
  }

  protected onPreviewVisibleChange(visible: boolean): void {
    if (!visible) {
      this.closePreview();
    }
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(input.files);
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    this.addFiles(event.dataTransfer?.files ?? null);
  }

  /** Local only — nothing hits the backend until `commitChanges` runs from Save. */
  protected removeAsset(assetId: string): void {
    const asset = this.assets().find((entry) => entry.id === assetId);
    if (!asset) {
      return;
    }

    if (asset.persisted) {
      this.deletedImageIds.update((ids) => new Set(ids).add(assetId));
    } else if (asset.previewUrl) {
      URL.revokeObjectURL(asset.previewUrl);
      this.previewUrls.delete(asset.previewUrl);
    }

    this.assets.update((current) => {
      const next = current.filter((entry) => entry.id !== assetId);
      if (asset.isPrimary && next.length > 0 && !next.some((entry) => entry.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
  }

  /** Local only — see `removeAsset`. */
  protected setPrimary(assetId: string): void {
    this.assets.update((current) =>
      current.map((entry) => ({
        ...entry,
        isPrimary: entry.id === assetId,
      })),
    );
  }

  /** Local only — see `removeAsset`. */
  protected onAssetDrop(event: CdkDragDrop<readonly ProductAssetFile[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const nextAssets = [...this.assets()];
    moveItemInArray(nextAssets, event.previousIndex, event.currentIndex);
    this.assets.set(nextAssets);
  }

  /** Pushes all staged image changes (adds/deletes/reorder/primary) to the backend. Called from
   * the page's Save action — never on its own, so images never persist ahead of the rest of the form. */
  async commitChanges(targetProductId: string): Promise<void> {
    if (!this.dirty()) {
      return;
    }

    this.uploading.set(true);
    try {
      for (const imageId of this.deletedImageIds()) {
        await firstValueFrom(this.productApi.deleteProductImage(targetProductId, imageId));
      }

      const orderedIds: string[] = [];
      let primaryId: string | null = null;

      for (const asset of this.assets()) {
        let resolvedId = asset.id;
        if (!asset.persisted && asset.file) {
          const uploaded = await firstValueFrom(this.productApi.uploadProductImage(targetProductId, asset.file));
          resolvedId = uploaded.id;
        }
        orderedIds.push(resolvedId);
        if (asset.isPrimary) {
          primaryId = resolvedId;
        }
      }

      if (orderedIds.length > 0) {
        await firstValueFrom(this.productApi.reorderProductImages(targetProductId, orderedIds));
      }
      if (primaryId) {
        await firstValueFrom(this.productApi.setPrimaryProductImage(targetProductId, primaryId));
      }

      await this.refreshPersistedImages(targetProductId);
    } catch {
      this.validationError.set('Unable to save image changes.');
    } finally {
      this.uploading.set(false);
    }
  }

  protected formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private addFiles(fileList: FileList | null): void {
    if (!fileList?.length) {
      return;
    }

    const currentCount = this.assets().length;
    const remainingSlots = PRODUCT_IMAGE_MAX_COUNT - currentCount;

    if (remainingSlots <= 0) {
      this.validationError.set(`You can upload up to ${PRODUCT_IMAGE_MAX_COUNT} images per product.`);
      return;
    }

    const candidates = Array.from(fileList).slice(0, remainingSlots);
    const validFiles: File[] = [];

    for (const file of candidates) {
      if (!isAllowedProductImage(file)) {
        this.validationError.set('Only JPG, PNG, WEBP, and GIF images are allowed.');
        continue;
      }

      if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
        this.validationError.set('Each image must be 5 MB or smaller.');
        continue;
      }

      validFiles.push(file);
    }

    if (!validFiles.length) {
      return;
    }

    this.validationError.set(null);

    const nextAssets = validFiles.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      this.previewUrls.add(previewUrl);

      return {
        id: crypto.randomUUID(),
        file,
        previewUrl,
        name: file.name,
        size: file.size,
        contentType: file.type,
        isPrimary: this.assets().length === 0,
      } satisfies ProductAssetFile;
    });

    this.assets.update((current) => [...current, ...nextAssets]);
  }

  private async refreshPersistedImages(productId: string): Promise<void> {
    const images = await firstValueFrom(this.productApi.getProductImages(productId));
    this.loadPersistedImages(images);
  }

  private revokeAllPreviews(): void {
    for (const previewUrl of this.previewUrls) {
      URL.revokeObjectURL(previewUrl);
    }

    this.previewUrls.clear();
  }
}
