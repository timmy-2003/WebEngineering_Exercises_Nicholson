import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { BearCard } from './bear-card';
import type { BearListState } from './bear-data';

/** Renders each state of the bear list explicitly; the data itself comes in through inputs. */
@Component({
  selector: 'app-bear-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BearCard],
  template: `
    @let current = state();
    @switch (current.status) {
      @case ('loading') {
        <p role="status">Loading bears from Wikipedia...</p>
      }
      @case ('error') {
        <div role="alert">
          <p class="error-message">{{ current.message }}</p>
          <button type="button" class="retry" (click)="retry.emit()">
            Try again
          </button>
        </div>
      }
      @case ('empty') {
        <p>No bears were found on the Wikipedia page.</p>
      }
      @case ('success') {
        @for (bear of current.bears; track bear.id) {
          <app-bear-card [bear]="bear" [query]="query()" />
        }
      }
    }
  `,
})
export class BearList {
  readonly state = input.required<BearListState>();
  readonly query = input('');
  readonly retry = output();
}
