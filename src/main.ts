// Entry point: mounts the Angular root component. From here on, everything inside <app-root> is
// owned by Angular - no other code reaches into that DOM subtree.

import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((err: unknown) => {
  // eslint-disable-next-line no-console -- nothing else can report a failed bootstrap
  console.error('Failed to start the application:', err);
});
