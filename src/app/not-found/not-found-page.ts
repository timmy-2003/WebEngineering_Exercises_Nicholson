import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  host: { class: 'page' },
  template: `
    <article>
      <font size="6">Page not found</font>
      <p>
        There is nothing at this address.
        <a routerLink="/">Back to the article</a>
      </p>
    </article>
  `,
})
export class NotFoundPage {}
