import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  resource,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError, getBear } from '../api/api-client';
import { Highlight } from '../search/highlight';
import { BearCard } from './bear-card';

const HTTP_NOT_FOUND = 404;

@Component({
  selector: 'app-bear-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BearCard, Highlight, RouterLink],
  host: { class: 'page' },
  template: `
    <article>
      <p>
        <a routerLink="/" queryParamsHandling="preserve"
          >&larr; Back to all bears</a
        >
      </p>

      @switch (bear.status()) {
        @case ('error') {
          <p class="error-message" role="alert">{{ errorMessage() }}</p>
        }
        @case ('resolved') {
          @if (bear.value(); as bear) {
            <font size="6"
              ><app-highlight [text]="bear.name" [query]="q()"
            /></font>
            <app-bear-card [bear]="bear" [query]="q()" [linked]="false" />

            <font size="5">About</font>
            @for (paragraph of paragraphs(); track $index) {
              <p><app-highlight [text]="paragraph" [query]="q()" /></p>
            } @empty {
              <p>Wikipedia has no introduction for this bear.</p>
            }
          }
        }
        @default {
          <p role="status">Loading bear...</p>
        }
      }
    </article>
  `,
})
export class BearDetailPage {
  readonly id = input.required<string>();
  readonly q = input('', {
    transform: (value: string | undefined) => value ?? '',
  });

  protected readonly bear = resource({
    params: () => this.id(),
    loader: async ({ params: id, abortSignal }) =>
      await getBear(id, abortSignal),
  });

  protected readonly paragraphs = computed(() =>
    (this.bear.value()?.intro ?? '')
      .split('\n')
      .filter((line) => line.trim() !== '')
  );

  protected readonly errorMessage = computed(() => {
    const error = this.bear.error();
    if (error instanceof ApiError && error.status === HTTP_NOT_FOUND) {
      return `There is no bear with the identifier "${this.id()}".`;
    }
    return 'Sorry, this bear could not be loaded right now. Please try again later.';
  });
}
