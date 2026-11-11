import {
  ChangeDetectionStrategy,
  Component,
  inject,
  linkedSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

/**
 * The search box in the navigation bar. The submitted query lives in the URL (`?q=`), which is
 * the single source of truth; the input only holds an editable draft of it.
 */
@Component({
  selector: 'app-search-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <form class="search" role="search" (ngSubmit)="search()">
      <input
        type="search"
        name="q"
        placeholder="Search query"
        aria-label="Search the article"
        [(ngModel)]="draft"
      />
      <input type="submit" value="Go!" />
    </form>
  `,
})
export class SearchForm {
  private readonly router = inject(Router);

  // Query params are global to the URL, so the root route sees `q` on every page.
  private readonly submittedQuery = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(
      map((params) => params.get('q') ?? '')
    ),
    { initialValue: '' }
  );

  // A controlled input whose value is editable locally, but resets to the URL's query whenever
  // that changes from elsewhere (back/forward navigation, following a link).
  protected readonly draft = linkedSignal(() => this.submittedQuery());

  protected search(): void {
    const q = this.draft().trim();
    // Stay on the current page; only the `q` query parameter changes (and is dropped if empty).
    const url = this.router.parseUrl(this.router.url);
    const { queryParams } = url;
    const { q: _previous, ...otherParams } = queryParams;
    url.queryParams = q === '' ? otherParams : { ...otherParams, q };
    void this.router.navigateByUrl(url);
  }
}
