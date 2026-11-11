import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Highlight } from '../search/highlight';
import { type Bear, PLACEHOLDER_IMAGE } from './bear';

@Component({
  selector: 'app-bear-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Highlight, RouterLink],
  template: `
    <div class="bear">
      <img
        [src]="imageSrc()"
        [alt]="'Image of ' + bear().name"
        (error)="useFallback()"
      />
      <p>
        @if (linked()) {
          <a
            [routerLink]="['/bears', bear().id]"
            queryParamsHandling="preserve"
          >
            <b><app-highlight [text]="bear().name" [query]="query()" /></b>
          </a>
        } @else {
          <b><app-highlight [text]="bear().name" [query]="query()" /></b>
        }
        (<app-highlight [text]="bear().binomial" [query]="query()" />)
      </p>
      <p>
        <app-highlight [text]="'Range: ' + bear().range" [query]="query()" />
      </p>
    </div>
  `,
})
export class BearCard {
  readonly bear = input.required<Bear>();
  readonly query = input('');
  readonly linked = input(true);

  protected readonly imageSrc = linkedSignal(
    () => this.bear().imageUrl ?? PLACEHOLDER_IMAGE
  );

  protected useFallback(): void {
    this.imageSrc.set(PLACEHOLDER_IMAGE);
  }
}
