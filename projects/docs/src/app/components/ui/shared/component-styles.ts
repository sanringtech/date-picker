export const CONTROL_TEXT_CLASS = 'text-sm font-medium';

export const CONTROL_SIZE_CLASSES = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
  icon: 'size-9 p-0',
  toolbar: 'h-[38px] min-w-[76px] px-3.5 text-sm',
  toolbarIcon: 'size-[38px] p-0',
} as const;

export const COMPACT_CONTROL_SIZE_CLASSES = {
  sm: 'h-8 px-2.5 text-sm',
  md: 'h-10 px-3 text-sm',
  lg: 'h-11 px-4 text-base',
} as const;

export const FIELD_SIZE_CLASS = 'h-10 px-3 py-2 text-sm';

export const TITLE_TEXT_CLASS = 'text-lg font-semibold leading-none tracking-tight';
export const SECTION_TITLE_TEXT_CLASS = 'font-semibold leading-none tracking-tight';
export const COMPACT_TITLE_TEXT_CLASS = 'text-sm font-semibold leading-none tracking-tight';
export const DESCRIPTION_TEXT_CLASS = 'text-sm text-[var(--dp-text-muted)]';
export const ALERT_TITLE_TEXT_CLASS = 'mb-1 font-medium leading-none tracking-tight';
export const ALERT_DESCRIPTION_TEXT_CLASS = 'text-sm [&_p]:leading-relaxed opacity-90';

export const NAV_ITEM_TEXT_CLASS = 'text-sm font-medium';
export const MENU_ITEM_SIZE_CLASS = 'min-h-8 px-2 py-1.5 text-sm';
export const BREADCRUMB_TEXT_CLASS = 'text-sm';
export const BREADCRUMB_CURRENT_PAGE_CLASS = 'font-normal text-[var(--dp-text-main)]';
export const BREADCRUMB_ICON_SIZE_CLASS = 'size-9';
export const BREADCRUMB_SEPARATOR_ICON_CLASS = 'size-4';

export const BADGE_TEXT_CLASS = 'text-xs font-semibold';
export const BADGE_SIZE_CLASS = 'px-2.5 py-0.5';
export const TAG_CLOSE_BUTTON_CLASS =
  'ml-1 inline-flex size-3.5 cursor-pointer items-center justify-center rounded-full text-current opacity-60 transition-opacity hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/20 focus-visible:outline-none';
export const TAG_CLOSE_ICON_CLASS = 'size-3';
export const LINK_TEXT_CLASS = 'font-medium';

export const OVERLAY_SURFACE_CLASS =
  'border border-[var(--dp-border)] bg-[var(--dp-elevated)] text-[var(--dp-text-main)] shadow-lg';
export const DIALOG_SURFACE_CLASS = 'relative z-50 grid w-full max-w-lg gap-4 p-6 sm:rounded-lg';
export const SHEET_SURFACE_CLASS = 'fixed z-50 flex flex-col gap-4 p-6';
export const POPOVER_SURFACE_CLASS = 'z-50 w-72 rounded-md p-4 shadow-md outline-none';
export const OVERLAY_BACKDROP_CLASS = 'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm';
export const OVERLAY_CLOSE_BUTTON_CLASS =
  'shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dp-border-strong)]';
export const OVERLAY_ABSOLUTE_CLOSE_BUTTON_CLASS =
  'absolute right-4 top-4 rounded-sm text-[var(--dp-text-muted)] opacity-70 ring-offset-[var(--dp-surface)] transition-colors transition-opacity hover:text-[var(--dp-text-main)] hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dp-border-strong)] focus-visible:ring-offset-2 disabled:pointer-events-none';
export const OVERLAY_CLOSE_ICON_CLASS = 'size-4';

export const TOOLTIP_SURFACE_CLASS =
  'relative z-50 max-w-64 break-words rounded-md border border-[var(--dp-border-strong)] bg-[var(--dp-text-main)] px-3 py-1.5 text-xs font-medium leading-5 text-[var(--dp-bg-base)] shadow-md';
export const TOOLTIP_ARROW_CLASS =
  'pointer-events-none absolute size-2 rotate-45 border border-[var(--dp-border-strong)] bg-[var(--dp-text-main)]';

export const TOAST_SURFACE_CLASS =
  'pointer-events-auto flex w-full items-start gap-3 rounded-lg p-4';
export const TOAST_TITLE_TEXT_CLASS = 'm-0 text-sm font-semibold leading-snug';
export const TOAST_DESCRIPTION_TEXT_CLASS = 'm-0 text-sm leading-snug text-[var(--dp-text-muted)]';
export const TOAST_ICON_CLASS = 'mt-0.5 size-5 shrink-0';
export const TOAST_ACTION_BUTTON_CLASS =
  'ml-auto shrink-0 rounded-md border border-[var(--dp-border)] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--dp-surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dp-border-strong)]';

export const SELECTION_CONTROL_BASE_CLASS =
  'peer flex shrink-0 items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-50';
export const SELECTION_CONTROL_FOCUS_CLASS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dp-border-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dp-bg-base)]';
export const CHECKBOX_SIZE_CLASSES = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
} as const;
export const CHECKBOX_ICON_SIZE_CLASSES = {
  sm: 'size-2.5',
  md: 'size-4',
  lg: 'size-5',
} as const;
export const CHECKBOX_STATE_CLASS =
  'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground';
export const RADIO_SIZE_CLASS = 'aspect-square h-4 w-4';
export const RADIO_INDICATOR_ICON_CLASS = 'h-2.5 w-2.5 fill-current text-current';
export const SWITCH_TRACK_SIZE_CLASSES = {
  sm: 'h-5 w-9',
  md: 'h-6 w-11',
  lg: 'h-7 w-12',
} as const;
export const SWITCH_THUMB_SIZE_CLASSES = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
} as const;
export const SWITCH_THUMB_TRANSLATE_CLASSES = {
  sm: 'translate-x-4',
  md: 'translate-x-5',
  lg: 'translate-x-5',
} as const;
