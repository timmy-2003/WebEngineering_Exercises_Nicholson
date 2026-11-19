import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import {
  ApiError,
  deleteComment,
  getComments,
  postComment,
  userMessage,
} from '../api/api-client';
import { Highlight } from '../search/highlight';
import type { Comment, CommentDraft } from './comment';
import { CommentForm } from './comment-form';
import { CommentList } from './comment-list';

const HTTP_NOT_FOUND = 404;

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
          <app-comment-form [save]="save" />

          <font size="6"
            ><app-highlight text="Comments" [query]="query()"
          /></font>
          @if (actionError(); as message) {
            <p class="error-message" role="alert">{{ message }}</p>
          }
          @switch (loaded.status()) {
            @case ('error') {
              <p class="error-message" role="alert">{{ loadError() }}</p>
            }
            @case ('loading') {
              <p role="status">Loading comments...</p>
            }
            @default {
              <app-comment-list
                [comments]="comments()"
                [query]="query()"
                (deleteRequested)="remove($event)"
              />
              @if (nextCursor() !== null) {
                <button
                  type="button"
                  class="load-more"
                  [disabled]="loadingMore()"
                  (click)="loadMore()"
                >
                  {{ loadingMore() ? 'Loading...' : 'Load more comments' }}
                </button>
              }
            }
          }
        </div>
      }
    </section>
  `,
})
export class CommentSection {
  readonly bearId = input.required<string>();
  readonly query = input('');

  protected readonly visible = signal(false);
  protected readonly actionError = signal<string | null>(null);

  protected readonly loaded = resource({
    params: () => this.bearId(),
    loader: async ({ params: bearId, abortSignal }) =>
      await getComments(bearId, abortSignal),
  });

  protected readonly comments = linkedSignal<readonly Comment[]>(
    () => this.loaded.value()?.items ?? []
  );

  protected readonly nextCursor = linkedSignal<string | null>(
    () => this.loaded.value()?.nextCursor ?? null
  );

  protected readonly loadingMore = signal(false);

  protected readonly loadError = computed(() =>
    userMessage(
      this.loaded.error(),
      'Sorry, the comments could not be loaded right now.'
    )
  );

  protected readonly toggleLabel = computed(() =>
    this.visible() ? 'Hide comments' : 'Show comments'
  );

  protected readonly save = async (draft: CommentDraft): Promise<void> => {
    const created = await postComment(this.bearId(), draft);
    this.comments.update((comments) => [created, ...comments]);
  };

  protected async loadMore(): Promise<void> {
    const cursor = this.nextCursor();
    if (cursor === null) {
      return;
    }
    this.actionError.set(null);
    this.loadingMore.set(true);
    try {
      const page = await getComments(
        this.bearId(),
        new AbortController().signal,
        cursor
      );
      this.comments.update((comments) => [...comments, ...page.items]);
      this.nextCursor.set(page.nextCursor);
    } catch (err) {
      this.actionError.set(
        userMessage(err, 'More comments could not be loaded. Please try again.')
      );
    } finally {
      this.loadingMore.set(false);
    }
  }

  protected toggle(): void {
    this.visible.update((visible) => !visible);
  }

  protected async remove(id: string): Promise<void> {
    this.actionError.set(null);
    try {
      await deleteComment(id);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === HTTP_NOT_FOUND)) {
        this.actionError.set(
          userMessage(
            err,
            'The comment could not be deleted. Please try again.'
          )
        );
        return;
      }
    }
    this.comments.update((comments) =>
      comments.filter((comment) => comment.id !== id)
    );
  }
}
