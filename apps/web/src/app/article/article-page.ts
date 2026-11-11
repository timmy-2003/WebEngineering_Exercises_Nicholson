import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { BearData } from '../bears/bear-data';
import { BearList } from '../bears/bear-list';
import { Highlight } from '../search/highlight';

interface BearTypeRow {
  type: string;
  coat: string;
  size: string;
  habitat: string;
  lifespan: string;
  diet: string;
}

@Component({
  selector: 'app-article-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BearList, Highlight],
  host: { class: 'page' },
  templateUrl: './article-page.html',
})
export class ArticlePage {
  readonly q = input('', {
    transform: (value: string | undefined) => value ?? '',
  });

  protected readonly bearData = inject(BearData);

  protected readonly tableHeadings = [
    'Bear Type',
    'Coat',
    'Adult size',
    'Habitat',
    'Lifespan',
    'Diet',
  ] as const;

  protected readonly bearTypes: readonly BearTypeRow[] = [
    {
      type: 'Wild',
      coat: 'Brown or black',
      size: '1.4 to 2.8 meters',
      habitat: 'Woods and forests',
      lifespan: '25 to 28 years',
      diet: 'Fish, meat, plants',
    },
    {
      type: 'Urban',
      coat: 'North Face',
      size: '18 to 22',
      habitat: 'Condos and coffee shops',
      lifespan: '20 to 32 years',
      diet: 'Starbucks, sushi',
    },
  ];
}
