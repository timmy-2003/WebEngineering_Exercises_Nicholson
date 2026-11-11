import { computed, Injectable, resource } from '@angular/core';
import { type Bear, loadBears } from './bear';

/** Every state the bear list can be in, as one explicit, exhaustive union. */
export type BearListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'success'; bears: readonly Bear[] };

/**
 * Owns the bear list. It is shared by the list page and the detail page (both need the same
 * data and should not fetch it twice), so it lives in a root-level service rather than in
 * either page component.
 */
@Injectable({ providedIn: 'root' })
export class BearData {
  // `resource` runs the loader and hands it an AbortSignal. Calling `reload()` while a request
  // is still in flight aborts that request, and a result that arrives for a superseded request
  // is discarded, so a stale response can never overwrite a newer one.
  private readonly bears = resource({
    loader: async ({ abortSignal }) => {
      try {
        return await loadBears(abortSignal);
      } catch (err) {
        if (!abortSignal.aborted) {
          // The user-facing message below is deliberately generic, so the real cause has to
          // stay visible somewhere for debugging.
          // eslint-disable-next-line no-console -- Deliberate debug logging
          console.error('Failed to load bear data:', err);
        }
        throw err;
      }
    },
  });

  readonly state = computed<BearListState>(() => {
    switch (this.bears.status()) {
      case 'idle':
      case 'loading':
      case 'reloading':
        return { status: 'loading' };
      case 'error':
        return {
          status: 'error',
          message:
            'Sorry, we could not load the bear information right now. Please try again later.',
        };
      case 'resolved':
      case 'local': {
        const bears = this.bears.value() ?? [];
        return bears.length === 0
          ? { status: 'empty' }
          : { status: 'success', bears };
      }
    }
  });

  reload(): void {
    this.bears.reload();
  }
}
