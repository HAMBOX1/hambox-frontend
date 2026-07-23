import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

/** Drag-drop + click-to-browse file picker. Emits the raw File and lets the caller perform the actual upload — mirrors product-assets-upload's hand-rolled drag/drop pattern (no PrimeNG FileUploadModule is used anywhere in this app). */
@Component({
  selector: 'app-admin-file-dropzone',
  standalone: true,
  templateUrl: './admin-file-dropzone.component.html',
  styleUrl: './admin-file-dropzone.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminFileDropzoneComponent {
  readonly accept = input<string>('*/*');
  readonly hint = input<string>('');
  readonly disabled = input(false);

  readonly fileSelected = output<File>();

  protected readonly isDragOver = signal(false);

  protected onBrowseClick(fileInput: HTMLInputElement): void {
    if (!this.disabled()) {
      fileInput.click();
    }
  }

  protected onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.fileSelected.emit(file);
    }

    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.disabled()) {
      this.isDragOver.set(true);
    }
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);

    if (this.disabled()) {
      return;
    }

    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.fileSelected.emit(file);
    }
  }
}
