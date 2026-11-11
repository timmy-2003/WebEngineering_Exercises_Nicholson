import {
  type ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // `withComponentInputBinding` binds route params (`:id`) and query params (`?q=`) straight
    // into the routed component's signal inputs, so pages read them like any other input.
    provideRouter(routes, withComponentInputBinding()),
  ],
};
