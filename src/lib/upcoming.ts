import type { TmdbItem } from './tmdb';

export const PINNED_ANTICIPATED = [1003596, 656908, 1170608, 1381071];
export const UPCOMING_LANGUAGES = new Set(['en', 'hi', 'ja', 'te', 'ta', 'ml', 'kn', 'bn', 'mr', 'pa']);

export function calendarDay(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function calendarWindow(today: string) {
  const d = new Date(`${today}T00:00:00Z`);
  const targetMonth = d.getUTCMonth() + 4;
  const end = new Date(Date.UTC(d.getUTCFullYear(), targetMonth + 1, 0));
  end.setUTCDate(Math.min(d.getUTCDate(), end.getUTCDate()));
  const tomorrow = new Date(d.getTime() + 86400000).toISOString().slice(0, 10);
  return { tomorrow, end: end.toISOString().slice(0, 10) };
}

export function futureItems(items: TmdbItem[], today: string, end?: string) {
  return items.filter(i => i.releaseDate && i.releaseDate > today && (!end || i.releaseDate <= end))
    .sort((a, b) => (a.releaseDate || '').localeCompare(b.releaseDate || ''));
}

// A missing discovery result is not evidence that a film has been released.
export function mergeCalendar(previous: TmdbItem[], incoming: TmdbItem[]) {
  const byId = new Map(previous.map(i => [i.id, i]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()];
}

export function theatricalDate(raw: { release_date?: string; release_dates?: { results?: { iso_3166_1: string; release_dates: { type: number; release_date: string }[] }[] } }, region: string) {
  const dates = raw.release_dates?.results?.find(r => r.iso_3166_1 === region)?.release_dates || [];
  for (const type of [3, 2]) {
    const date = dates.filter(d => d.type === type).map(d => d.release_date.slice(0, 10)).sort()[0];
    if (date) return date;
  }
  return raw.release_date || null;
}

export function releaseRegion(language?: string) {
  return language === 'ja' ? 'JP' : language === 'en' ? 'US' : 'IN';
}