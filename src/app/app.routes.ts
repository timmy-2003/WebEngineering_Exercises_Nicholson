import type { Routes } from '@angular/router';
import { ArticlePage } from './article/article-page';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: ArticlePage,
    title: 'The trouble with Bears',
  },
  {
    path: 'bears/:id',
    loadComponent: async () =>
      (await import('./bears/bear-detail-page')).BearDetailPage,
    title: 'Bear details',
  },
  {
    path: '**',
    loadComponent: async () =>
      (await import('./not-found/not-found-page')).NotFoundPage,
    title: 'Page not found',
  },
];
