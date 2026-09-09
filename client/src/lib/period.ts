import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { enUS, it, ro, ru, type Locale } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

export type Period = 'day' | 'week' | 'month' | 'year';

export const LOCALES: Record<string, Locale> = { en: enUS, ro, it, ru };

export function useDateLocale(): Locale {
  const { i18n } = useTranslation();
  return LOCALES[i18n.language] ?? enUS;
}

export function periodRange(period: Period, anchor: Date, weekStartsOn: 0 | 1 = 1) {
  switch (period) {
    case 'day':
      return { start: startOfDay(anchor), end: endOfDay(anchor) };
    case 'week':
      return { start: startOfWeek(anchor, { weekStartsOn }), end: endOfWeek(anchor, { weekStartsOn }) };
    case 'month':
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
    case 'year':
      return { start: startOfYear(anchor), end: endOfYear(anchor) };
  }
}

export function shiftAnchor(period: Period, anchor: Date, dir: 1 | -1) {
  switch (period) {
    case 'day':
      return addDays(anchor, dir);
    case 'week':
      return addWeeks(anchor, dir);
    case 'month':
      return addMonths(anchor, dir);
    case 'year':
      return addYears(anchor, dir);
  }
}

export function formatRangeLabel(period: Period, anchor: Date, locale: Locale, weekStartsOn: 0 | 1 = 1) {
  const { start, end } = periodRange(period, anchor, weekStartsOn);
  switch (period) {
    case 'day':
      return format(anchor, 'PPP', { locale });
    case 'week':
      return `${format(start, 'd MMM', { locale })} – ${format(end, 'd MMM yyyy', { locale })}`;
    case 'month':
      return format(anchor, 'MMMM yyyy', { locale });
    case 'year':
      return format(anchor, 'yyyy', { locale });
  }
}

export interface Bucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

/** Sub-period buckets: week -> days, month -> weeks, year -> months. Day has none. */
export function buildBuckets(period: Period, anchor: Date, locale: Locale, weekStartsOn: 0 | 1 = 1): Bucket[] {
  const { start, end } = periodRange(period, anchor, weekStartsOn);
  switch (period) {
    case 'week':
      return eachDayOfInterval({ start, end }).map((d) => ({
        key: d.toISOString(),
        label: format(d, 'EEE d', { locale }),
        start: startOfDay(d),
        end: endOfDay(d),
      }));
    case 'month':
      return eachWeekOfInterval({ start, end }, { weekStartsOn }).map((wStart) => {
        const bStart = startOfWeek(wStart, { weekStartsOn });
        const bEnd = endOfWeek(wStart, { weekStartsOn });
        return {
          key: bStart.toISOString(),
          label: `${format(bStart, 'd MMM', { locale })} – ${format(bEnd, 'd MMM', { locale })}`,
          start: bStart,
          end: bEnd,
        };
      });
    case 'year':
      return eachMonthOfInterval({ start, end }).map((m) => ({
        key: m.toISOString(),
        label: format(m, 'MMM', { locale }),
        start: startOfMonth(m),
        end: endOfMonth(m),
      }));
    case 'day':
      return [];
  }
}
