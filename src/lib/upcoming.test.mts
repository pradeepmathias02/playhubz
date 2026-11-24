import { describe, expect, test } from 'bun:test';
import { calendarDay, calendarWindow, futureItems, mergeCalendar, theatricalDate, PINNED_ANTICIPATED } from './upcoming';
import type { TmdbItem } from './tmdb';
const film = (id: number, releaseDate: string): TmdbItem => ({ id, releaseDate, title: 'Movie', overview: '', posterPath: '/poster.jpg', backdropPath: null, voteAverage: 0, mediaType: 'movie', genreIds: [] });
describe('Upcoming calendar rules', () => {
  test('Oct 20 release leaves on Oct 20, but Oct 21 remains', () => {
    expect(futureItems([film(1, '2026-10-20'), film(2, '2026-10-21')], '2026-10-20').map(i => i.id)).toEqual([2]);
  });
  test('covers four calendar months, including Feb 20', () => {
    expect(calendarWindow('2026-10-20')).toEqual({ tomorrow: '2026-10-21', end: '2027-02-20' });
  });
  test('discovery popularity changes do not remove an unreleased film', () => {
    expect(mergeCalendar([film(1400940, '2026-10-23')], [film(2, '2026-10-24')]).map(i => i.id)).toEqual([1400940, 2]);
  });
  test('a changed release date replaces the old date without duplicate cards', () => {
    expect(mergeCalendar([film(1, '2026-10-21')], [film(1, '2026-11-20')])).toEqual([film(1, '2026-11-20')]);
  });
  test('Clayface uses theatrical Oct 23 rather than premiere Oct 20', () => {
    expect(theatricalDate({ release_date: '2026-10-21', release_dates: { results: [{ iso_3166_1: 'US', release_dates: [{ type: 1, release_date: '2026-10-20T00:00:00Z' }, { type: 3, release_date: '2026-10-23T00:00:00Z' }] }] } }, 'US')).toBe('2026-10-23');
  });
  test('calendar advances at Indian midnight', () => {
    expect(calendarDay(new Date('2026-10-20T18:30:00Z'))).toBe('2026-10-21');
  });
  test('preserves requested four anticipated films in order', () => {
    expect(PINNED_ANTICIPATED).toEqual([1003596, 656908, 1170608, 1381071]);
  });
});