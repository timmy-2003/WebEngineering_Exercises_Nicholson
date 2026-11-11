import { computed, Injectable, resource } from '@angular/core';
import { getBears, userMessage } from '../api/api-client';
import type { Bear } from './bear';

export type BearListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'success'; bears: readonly Bear[] };

@Injectable({ providedIn: 'root' })
export class BearData {
  private readonly bears = resource({
    loader: async ({ abortSignal }) => {
      try {
        return await getBears(abortSignal);
      } catch (err) {
        if (!abortSignal.aborted) {
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
          message: userMessage(
            this.bears.error(),
            'Sorry, we could not load the bear information right now. Please try again later.'
          ),
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
