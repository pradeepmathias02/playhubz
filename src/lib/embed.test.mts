import { expect, test } from 'bun:test';
import { buildEmbedUrls } from './embed';

test('movies use VidSpeed first and VidSrc.wiki as backup', () => {
  expect(buildEmbedUrls({ mediaType: 'movie', id: 931285 })).toEqual([
    'https://vidspeed.sbs/embed/movie/931285/',
    'https://vidsrc.wiki/embed/movie/931285/',
  ]);
});

test('TV uses both servers with the requested season and episode', () => {
  expect(buildEmbedUrls({ mediaType: 'tv', id: 1399, season: 2, episode: 3 })).toEqual([
    'https://vidspeed.sbs/embed/tv/1399/2/3/',
    'https://vidsrc.wiki/embed/tv/1399/2/3/',
  ]);
});

test('TV defaults to season one episode one', () => {
  expect(buildEmbedUrls({ mediaType: 'tv', id: 1399 })).toEqual([
    'https://vidspeed.sbs/embed/tv/1399/1/1/',
    'https://vidsrc.wiki/embed/tv/1399/1/1/',
  ]);
});
