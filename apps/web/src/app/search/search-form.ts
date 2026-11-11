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

  private readonly submittedQuery = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(
      map((params) => params.get('q') ?? '')
    ),
    { initialValue: '' }
  );

  protected readonly draft = linkedSignal(() => this.submittedQuery());

  protected search(): void {
    const q = this.draft().trim();
    const url = this.router.parseUrl(this.router.url);
    const { queryParams } = url;
    const { q: _previous, ...otherParams } = queryParams;
    url.queryParams = q === '' ? otherParams : { ...otherParams, q };
    void this.router.navigateByUrl(url);
  }
}
