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
              import('./pages/widget/widget-index-page.component').then(
                (m) => m.WidgetIndexPageComponent,
              ),
          },
          {
            path: 'widget/single',
            loadComponent: () =>
              import('./pages/widget/widget-page.component').then((m) => m.WidgetPageComponent),
          },
          {
            path: 'widget/range',
            loadComponent: () =>
              import('./pages/widget/range/range-widget-page.component').then(
                (m) => m.RangeWidgetPageComponent,
              ),
          },
          {
            path: 'widget/multi',
            loadComponent: () =>
              import('./pages/widget/multi/multi-widget-page.component').then(
                (m) => m.MultiWidgetPageComponent,
              ),
          },
          {
            path: 'widget/granularity',
            loadComponent: () =>
              import('./pages/widget/granularity/granularity-widget-page.component').then(
                (m) => m.GranularityWidgetPageComponent,
              ),
          },
          {
            path: 'widget/granularity-range',
            loadComponent: () =>
              import(
                './pages/widget/granularity-range/granularity-range-widget-page.component'
              ).then((m) => m.GranularityRangeWidgetPageComponent),
          },
          {
            path: 'widget/granularity-multi',
            loadComponent: () =>
              import(
                './pages/widget/granularity-multi/granularity-multi-widget-page.component'
              ).then((m) => m.GranularityMultiWidgetPageComponent),
          },
          {
            path: 'widget/time',
            loadComponent: () =>
              import('./pages/widget/time/time-widget-page.component').then(
                (m) => m.TimeWidgetPageComponent,
              ),
          },
          {
            path: 'widget/time-range',
            loadComponent: () =>
              import('./pages/widget/time-range/time-range-widget-page.component').then(
                (m) => m.TimeRangeWidgetPageComponent,
              ),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
