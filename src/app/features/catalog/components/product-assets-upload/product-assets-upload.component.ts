import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { firstValueFrom } from 'rxjs';

import { ProductAssetFile, ProductDraftAssetMetadata, ProductImage } from '../../models/product.model';
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
  imports: [ButtonModule, DragDropModule],
  templateUrl: './product-assets-upload.component.html',
  styleUrl: './product-assets-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductAssetsUploadComponent implements OnDestroy {
  private readonly productApi = inject(ProductApiService);

  readonly productId = input<string | null>(null);

  readonly assetsChanged = output<readonly ProductDraftAssetMetadata[]>();

  protected readonly assets = signal<readonly ProductAssetFile[]>([]);
  protected readonly isDragOver = signal(false);
  protected readonly uploading = signal(false);
  protected readonly validationError = signal<string | null>(null);

  private readonly previewUrls = new Set<string>();

  constructor() {
    effect(() => {
      const productId = this.productId();
      if (!productId) {
        return;
      }

      void this.refreshPersistedImages(productId);
    });
  }

  ngOnDestroy(): void {
    this.revokeAllPreviews();
  }

  getPendingFiles(): readonly File[] {
    return this.assets()
      .filter((asset) => !asset.persisted && asset.file)
      .map((asset) => asset.file as File);
  }

  async uploadPendingFiles(targetProductId: string): Promise<void> {
    const pending = this.getPendingFiles();

    for (const file of pending) {
      await firstValueFrom(this.productApi.uploadProductImage(targetProductId, file));
    }

    await this.refreshPersistedImages(targetProductId);
  }

  loadPersistedImages(images: readonly ProductImage[]): void {
    this.revokeAllPreviews();

    this.assets.set(
      [...images]
        .sort((left, right) => left.displayOrder - right.displayOrder)
        .map((image) => ({
          id: image.id,
          name: image.fileName,
          size: image.fileSizeBytes,
          previewUrl: resolveProductImageUrl(image.url),
          persisted: true,
          isPrimary: image.isPrimary,
          contentType: image.contentType,
        })),
    );

    this.emitAssetsChanged();
  }

  getAssetMetadata(): readonly ProductDraftAssetMetadata[] {
    return this.assets().map((asset) => ({
      name: asset.name,
      size: asset.size,
    }));
  }

  applyAssetMetadata(metadata: readonly ProductDraftAssetMetadata[]): void {
    this.revokeAllPreviews();
    this.assets.set([]);
    this.validationError.set(null);
    this.emitAssetsChanged();

    if (!metadata.length) {
      return;
    }

    this.validationError.set(
      'Draft image files cannot be restored after reload. Re-select images to upload them.',
    );
  }

  protected onBrowseClick(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.addFiles(input.files);
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
    void this.addFiles(event.dataTransfer?.files ?? null);
  }

  protected async removeAsset(assetId: string): Promise<void> {
    const asset = this.assets().find((entry) => entry.id === assetId);
    const productId = this.productId();

    if (asset?.persisted && productId) {
      this.uploading.set(true);
      try {
        await firstValueFrom(this.productApi.deleteProductImage(productId, assetId));
        await this.refreshPersistedImages(productId);
      } catch {
        this.validationError.set('Unable to delete image.');
      } finally {
        this.uploading.set(false);
      }
      return;
    }

    if (asset?.previewUrl && !asset.persisted) {
      URL.revokeObjectURL(asset.previewUrl);
      this.previewUrls.delete(asset.previewUrl);
    }

    this.assets.update((current) => current.filter((entry) => entry.id !== assetId));
    this.emitAssetsChanged();
  }

  protected async setPrimary(assetId: string): Promise<void> {
    const productId = this.productId();
    const asset = this.assets().find((entry) => entry.id === assetId);

    if (!productId || !asset?.persisted) {
      this.assets.update((current) =>
        current.map((entry) => ({
          ...entry,
          isPrimary: entry.id === assetId,
        })),
      );
      return;
    }

    this.uploading.set(true);
    try {
      await firstValueFrom(this.productApi.setPrimaryProductImage(productId, assetId));
      await this.refreshPersistedImages(productId);
    } catch {
      this.validationError.set('Unable to set primary image.');
    } finally {
      this.uploading.set(false);
    }
  }

  protected async onAssetDrop(event: CdkDragDrop<readonly ProductAssetFile[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const nextAssets = [...this.assets()];
    moveItemInArray(nextAssets, event.previousIndex, event.currentIndex);
    this.assets.set(nextAssets);

    const productId = this.productId();
    const persistedIds = nextAssets.filter((asset) => asset.persisted).map((asset) => asset.id);

    if (productId && persistedIds.length === nextAssets.length && persistedIds.length > 0) {
      this.uploading.set(true);
      try {
        await firstValueFrom(this.productApi.reorderProductImages(productId, persistedIds));
        await this.refreshPersistedImages(productId);
      } catch {
        this.validationError.set('Unable to reorder images.');
      } finally {
        this.uploading.set(false);
      }
      return;
    }

    this.emitAssetsChanged();
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

  private async addFiles(fileList: FileList | null): Promise<void> {
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
    const productId = this.productId();

    if (productId) {
      this.uploading.set(true);
      try {
        for (const file of validFiles) {
          await firstValueFrom(this.productApi.uploadProductImage(productId, file));
        }

        await this.refreshPersistedImages(productId);
      } catch {
        this.validationError.set('Unable to upload one or more images.');
      } finally {
        this.uploading.set(false);
      }
      return;
    }

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
    this.emitAssetsChanged();
  }

  private async refreshPersistedImages(productId: string): Promise<void> {
    const images = await firstValueFrom(this.productApi.getProductImages(productId));
    this.loadPersistedImages(images);
  }

  private emitAssetsChanged(): void {
    this.assetsChanged.emit(this.getAssetMetadata());
  }

  private revokeAllPreviews(): void {
    for (const previewUrl of this.previewUrls) {
      URL.revokeObjectURL(previewUrl);
    }

    this.previewUrls.clear();
  }
}
