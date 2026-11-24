import { expect, test } from 'bun:test';
import { sitemapStaticPaths, sitemapXML } from './sitemap';
import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

test('includes public static pages and excludes auth and unresolved title IDs', () => {
  const root = createRootRoute({ staticData: { sitemap: false } });
  const children = [
    createRoute({ getParentRoute: () => root, path: '/', staticData: { sitemap: true } }),
    createRoute({ getParentRoute: () => root, path: '/upcoming', staticData: { sitemap: true } }),
    createRoute({ getParentRoute: () => root, path: '/search', staticData: { sitemap: true } }),
    createRoute({ getParentRoute: () => root, path: '/auth', staticData: { sitemap: false } }),
    createRoute({ getParentRoute: () => root, path: '/title/$mediaType/$id', staticData: { sitemap: false } }),
  ];
  const router = createRouter({ routeTree: root.addChildren(children) });
  expect(sitemapStaticPaths(router)).toEqual(['/', '/search', '/upcoming']);
});

test('uses the published domain without invented lastmod dates', () => {
  const xml = sitemapXML('https://playhubz.lovable.app', [{ path: '/' }, { path: '/upcoming' }]);
  expect(xml).toContain('<loc>https://playhubz.lovable.app/upcoming</loc>');
  expect(xml).not.toContain('<lastmod>');
});