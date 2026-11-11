import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { Highlight } from '../search/highlight';
import type { Comment, CommentDraft } from './comment';
import { CommentForm } from './comment-form';
import { CommentList } from './comment-list';

const INITIAL_COMMENTS: readonly Comment[] = [
  {
    id: 1,
    name: 'Bob Fossil',
    text: 'Oh I am so glad you taught me all about the big brown angry guys...',
  },
];

@Component({
  selector: 'app-comment-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommentForm, CommentList, Highlight],
  template: `
    <section class="comments">
      <button
        type="button"
        class="show-hide"
        aria-controls="comment-wrapper"
        [attr.aria-expanded]="visible()"
        (click)="toggle()"
      >
        {{ toggleLabel() }}
      </button>

      @if (visible()) {
        <div class="comment-wrapper" id="comment-wrapper">
          <font size="6">Add comment</font>
          <app-comment-form (commentAdded)="add($event)" />

          <font size="6"
            ><app-highlight text="Comments" [query]="query()"
          /></font>
          <app-comment-list [comments]="comments()" [query]="query()" />
        </div>
      }
    </section>
  `,
})
export class CommentSection {
  readonly query = input('');

  protected readonly visible = signal(false);
  protected readonly comments = signal<readonly Comment[]>(INITIAL_COMMENTS);
  private nextId = INITIAL_COMMENTS.length + 1;

  protected readonly toggleLabel = computed(() =>
    this.visible() ? 'Hide comments' : 'Show comments'
  );

  protected toggle(): void {
    this.visible.update((visible) => !visible);
  }

  protected add(draft: CommentDraft): void {
    const comment: Comment = { id: this.nextId, ...draft };
    this.nextId += 1;
    this.comments.update((comments) => [...comments, comment]);
  }
}
