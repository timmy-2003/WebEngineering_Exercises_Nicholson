import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { SearchForm } from './search/search-form';

/** Application shell: the parts of the page that stay put while routes change. */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterOutlet, SearchForm],
  templateUrl: './app.html',
})
export class App {
  protected readonly relatedArticles = [
    'The trouble with Bees',
    'The trouble with Otters',
    'The trouble with Penguins',
    'The trouble with Octopi',
    'The trouble with Lemurs',
  ] as const;
}
