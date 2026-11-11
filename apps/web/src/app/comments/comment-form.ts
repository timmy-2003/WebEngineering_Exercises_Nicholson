import {
  ChangeDetectionStrategy,
  Component,
  computed,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CommentDraft } from './comment';

@Component({
  selector: 'app-comment-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <form class="comment-form" (ngSubmit)="submit()">
      <div class="flex-pair">
        <label for="name">Your name:</label>
        <input
          type="text"
          name="name"
          id="name"
          placeholder="Enter your name"
          required
          [(ngModel)]="name"
        />
      </div>
      <div class="flex-pair">
        <label for="comment">Your comment:</label>
        <input
          type="text"
          name="comment"
          id="comment"
          placeholder="Enter your comment"
          required
          [(ngModel)]="text"
        />
      </div>
      <div>
        <input type="submit" value="Submit comment" [disabled]="!canSubmit()" />
      </div>
    </form>
  `,
})
export class CommentForm {
  readonly commentAdded = output<CommentDraft>();

  protected readonly name = signal('');
  protected readonly text = signal('');

  protected readonly canSubmit = computed(
    () => this.name().trim() !== '' && this.text().trim() !== ''
  );

  protected submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.commentAdded.emit({
      name: this.name().trim(),
      text: this.text().trim(),
    });
    this.name.set('');
    this.text.set('');
  }
}
