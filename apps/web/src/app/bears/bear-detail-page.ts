import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Highlight } from '../search/highlight';
import { BearCard } from './bear-card';
import { BearData } from './bear-data';
import { fetchArticleIntro } from './wiki-api';

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

      @let list = bearData.state();
      @switch (list.status) {
        @case ('loading') {
          <p role="status">Loading bears from Wikipedia...</p>
        }
        @case ('error') {
          <p class="error-message" role="alert">{{ list.message }}</p>
        }
        @default {
          @if (bear(); as bear) {
            <font size="6"
              ><app-highlight [text]="bear.name" [query]="q()"
            /></font>
            <app-bear-card [bear]="bear" [query]="q()" [linked]="false" />

            <font size="5">About</font>
            @switch (intro.status()) {
              @case ('error') {
                <p class="error-message" role="alert">
                  Sorry, the Wikipedia introduction could not be loaded.
                </p>
              }
              @case ('resolved') {
                @if (paragraphs().length > 0) {
                  @for (paragraph of paragraphs(); track $index) {
                    <p><app-highlight [text]="paragraph" [query]="q()" /></p>
                  }
                } @else {
                  <p>Wikipedia has no introduction for this bear.</p>
                }
              }
              @default {
                <p role="status">Loading introduction...</p>
              }
            }
          } @else {
            <p class="error-message" role="alert">
              There is no bear with the identifier "{{ id() }}".
            </p>
          }
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

  protected readonly bearData = inject(BearData);

  protected readonly bear = computed(() => {
    const list = this.bearData.state();
    return list.status === 'success'
      ? list.bears.find((bear) => bear.id === this.id())
      : undefined;
  });

  protected readonly intro = resource({
    params: () => this.bear()?.name,
    loader: async ({ params: title, abortSignal }) =>
      await fetchArticleIntro(title, abortSignal),
  });

  protected readonly paragraphs = computed(() =>
    (this.intro.value() ?? '').split('\n').filter((line) => line.trim() !== '')
  );
}
