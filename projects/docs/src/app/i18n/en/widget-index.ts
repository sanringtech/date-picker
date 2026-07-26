import type { WidgetIndexDictionary } from '../i18n.types';

export const widgetIndex: WidgetIndexDictionary = {
  pageTitle: 'Widget Layer',
  pageDescription:
    'The composed layer: preset-styled popover DatePicker components on top of the engine, installable via npm or copied into your project for full ownership.',
  singleTitle: 'DatePicker (Single)',
  singleDescription: 'Single date selection, a popover calendar anchored with CDK Overlay',
  rangeTitle: 'DateRangePicker',
  rangeDescription: 'Start/end date range selection',
  modesHeading: 'Two consumption modes',
  modesDescriptionPrefix: 'Both rely on',
  modesDescriptionSuffix:
    'as the real engine; copy mode only transfers ownership of the shell (input + overlay + Tailwind markup) — the state machine, keyboard handling, and WAI-ARIA bindings stay in the engine you continue to import, so nothing decouples.',
  npmTitle: 'npm install (black box)',
  npmSubtitle: 'For developers who want to ship quickly',
  installLabel: 'Install',
  npmInstallValueSuffix: ', done',
  customizeLabel: 'Customize',
  npmCustomizeValue: 'CSS variables + format/disabled inputs',
  updateLabel: 'Update',
  copyTitle: 'Copy mode (ownership transfer)',
  copySubtitle: 'For developers who need deep style/interaction customization',
  copyInstallValue: 'Copy 4 files into your project',
  copyCustomizeValue: 'Anything — you own the markup',
  copyUpdateValue: 'Manual — track upstream yourself',
  copyStepsPrefix: 'See the package',
  copyStepsSuffix: 'for the “Copy mode” section.',
};
