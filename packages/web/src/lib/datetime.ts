import type { Locale } from '@/i18n/config';

const localeTimezones: Record<Locale, string> = {
  en: 'America/New_York',
  ko: 'Asia/Seoul',
  ja: 'Asia/Tokyo',
  zh: 'Asia/Shanghai',
};

export function getTimezoneForLocale(locale: Locale): string {
  return localeTimezones[locale];
}

export function formatTime(date: Date, locale: Locale): string {
  const timezone = getTimezoneForLocale(locale);
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });
}

export function formatTimeWithSeconds(date: Date, locale: Locale): string {
  const timezone = getTimezoneForLocale(locale);
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: timezone,
  });
}

export function formatDateTime(date: Date, locale: Locale): string {
  const timezone = getTimezoneForLocale(locale);
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: locale === 'en',
    timeZone: timezone,
  });
}
