import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((err: unknown) => {
  // eslint-disable-next-line no-console -- nothing else can report a failed bootstrap
  console.error('Failed to start the application:', err);
});
