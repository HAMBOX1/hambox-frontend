import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-write-review-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './write-review-dialog.component.html',
  styleUrl: './write-review-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WriteReviewDialogComponent {
  readonly visible = input(false);
  readonly productName = input('');

  readonly closed = output<void>();
  readonly submitted = output<{ rating: number; comment: string }>();

  protected readonly rating = signal(5);
  protected readonly comment = signal('');

  protected setRating(value: number): void {
    this.rating.set(value);
  }

  protected onCommentInput(event: Event): void {
    this.comment.set((event.target as HTMLTextAreaElement).value);
  }

  protected discard(): void {
    this.comment.set('');
    this.rating.set(5);
    this.closed.emit();
  }

  protected submit(): void {
    const comment = this.comment().trim();
    if (!comment) {
      return;
    }

    this.submitted.emit({ rating: this.rating(), comment });
    this.comment.set('');
    this.rating.set(5);
  }
}
