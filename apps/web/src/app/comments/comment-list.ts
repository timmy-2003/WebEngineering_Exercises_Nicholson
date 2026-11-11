import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { Highlight } from '../search/highlight';
import type { Comment } from './comment';

@Component({
  selector: 'app-comment-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Highlight],
  template: `
    <ul class="comment-container">
      @for (comment of comments(); track comment.id) {
        <li>
          <p><app-highlight [text]="comment.author" [query]="query()" /></p>
          <p><app-highlight [text]="comment.text" [query]="query()" /></p>
          <button
            type="button"
            class="delete-comment"
            [attr.aria-label]="'Delete comment by ' + comment.author"
            (click)="deleteRequested.emit(comment.id)"
          >
            Delete
          </button>
        </li>
      } @empty {
        <li><p>No comments yet.</p></li>
      }
    </ul>
  `,
})
export class CommentList {
  readonly comments = input.required<readonly Comment[]>();
  readonly query = input('');
  readonly deleteRequested = output<string>();
}
