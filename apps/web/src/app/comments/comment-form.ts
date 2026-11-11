import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiError } from '../api/api-client';
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
          maxlength="80"
          required
          [(ngModel)]="author"
        />
      </div>
      <div class="flex-pair">
        <label for="comment">Your comment:</label>
        <input
          type="text"
          name="comment"
          id="comment"
          placeholder="Enter your comment"
          maxlength="2000"
          required
          [(ngModel)]="text"
        />
      </div>
      @if (error(); as message) {
        <p class="error-message" role="alert">{{ message }}</p>
      }
      <div>
        <input
          type="submit"
          [value]="saving() ? 'Saving...' : 'Submit comment'"
          [disabled]="!canSubmit()"
        />
      </div>
    </form>
  `,
})
export class CommentForm {
  readonly save = input.required<(draft: CommentDraft) => Promise<void>>();

  protected readonly author = signal('');
  protected readonly text = signal('');
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly canSubmit = computed(
    () =>
      !this.saving() && this.author().trim() !== '' && this.text().trim() !== ''
  );

  protected async submit(): Promise<void> {
    if (!this.canSubmit()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.save()({
        author: this.author().trim(),
        text: this.text().trim(),
      });
      this.author.set('');
      this.text.set('');
    } catch (err) {
      this.error.set(
        err instanceof ApiError
          ? err.detail
          : 'Your comment could not be saved. Please try again.'
      );
    } finally {
      this.saving.set(false);
    }
  }
}
