import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/docs-shell.component').then((m) => m.DocsShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/home/home-page.component').then((m) => m.HomePageComponent),
      },
      {
        path: '',
        loadComponent: () =>
          import('./layouts/docs-sidebar-layout.component').then(
            (m) => m.DocsSidebarLayoutComponent,
          ),
        children: [
          {
            path: 'engine',
            loadComponent: () =>
              import('./pages/engine/engine-index-page.component').then(
                (m) => m.EngineIndexPageComponent,
              ),
          },
          {
            path: 'engine/calendar',
            loadComponent: () =>
              import('./pages/engine/calendar/calendar-engine-page.component').then(
                (m) => m.CalendarEnginePageComponent,
              ),
          },
          {
            path: 'engine/granularity',
            loadComponent: () =>
              import('./pages/engine/granularity/granularity-engine-page.component').then(
                (m) => m.GranularityEnginePageComponent,
              ),
          },
          {
            path: 'engine/time',
            loadComponent: () =>
              import('./pages/engine/time/time-engine-page.component').then(
                (m) => m.TimeEnginePageComponent,
              ),
          },
          {
            path: 'widget',
            loadComponent: () =>
              import('./pages/widget/widget-page.component').then((m) => m.WidgetPageComponent),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
