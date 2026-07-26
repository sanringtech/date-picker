import { Injectable, computed, signal } from '@angular/core';
import type { Dictionary, Locale } from './i18n.types';
import { zhDictionary } from './zh';
import { enDictionary } from './en';

const DICTIONARIES: Record<Locale, Dictionary> = {
  zh: zhDictionary,
  en: enDictionary,
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly _locale = signal<Locale>('zh');
  readonly locale = this._locale.asReadonly();
  readonly t = computed(() => DICTIONARIES[this._locale()]);

  setLocale(locale: Locale): void {
    this._locale.set(locale);
  }
}
