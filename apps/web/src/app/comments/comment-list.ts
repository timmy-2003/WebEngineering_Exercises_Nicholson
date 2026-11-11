import { ChangeDetectionStrategy, Component, input } from '@angular/core';
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
          <p><app-highlight [text]="comment.name" [query]="query()" /></p>
          <p><app-highlight [text]="comment.text" [query]="query()" /></p>
        </li>
      }
    </ul>
  `,
})
export class CommentList {
  readonly comments = input.required<readonly Comment[]>();
  readonly query = input('');
}
