/**
 * Offline integrity check for the two static GitHub Pages languages.
 * No network requests, dependencies, workflows or user data.
 * Run from the repository root: node scripts/verify-site.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = 'https://gcasaldi.github.io/giuliacasaldibjj/';
const pages = [
  { file: 'index.html', lang: 'it', canonical: base },
  { file: 'en/index.html', lang: 'en', canonical: base + 'en/' },
];
const errors = [];
const read = (file) => readFileSync(join(root, file), 'utf8');
const fail = (file, detail) => errors.push(`${file}: ${detail}`);
const attribute = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return m?.[2] ?? null;
};
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(m => m[0]);
const headMeta = (html, attr, value) => tags(html, 'meta').find(t => attribute(t, attr) === value);
const headLink = (html, rel, hreflang) => tags(html, 'link').find(t => attribute(t, 'rel') === rel && (hreflang === undefined || attribute(t, 'hreflang') === hreflang));

for (const page of pages) {
  const { file, lang, canonical } = page;
  let html;
  try { html = read(file); } catch { fail(file, 'HTML file missing'); continue; }
  if (!new RegExp(`<html\\s+[^>]*lang=["']${lang}["']`, 'i').test(html)) fail(file, `missing html lang=${lang}`);
  if (!/<title>[^<]+<\/title>/i.test(html)) fail(file, 'missing page title');
  if (!attribute(headMeta(html, 'name', 'description') || '', 'content')) fail(file, 'missing meta description');
  if (attribute(headLink(html, 'canonical') || '', 'href') !== canonical) fail(file, 'canonical does not match page URL');
  if (attribute(headMeta(html, 'property', 'og:url') || '', 'content') !== canonical) fail(file, 'og:url does not match canonical');
  const expectedLocale = lang === 'it' ? 'it_IT' : 'en_US';
  const alternateLocale = lang === 'it' ? 'en_US' : 'it_IT';
  if (attribute(headMeta(html, 'property', 'og:locale') || '', 'content') !== expectedLocale) fail(file, 'og:locale does not match page language');
  if (attribute(headMeta(html, 'property', 'og:locale:alternate') || '', 'content') !== alternateLocale) fail(file, 'missing other-language Open Graph locale');
  for (const [code, href] of [['it', base], ['en', base + 'en/'], ['x-default', base]]) {
    if (attribute(headLink(html, 'alternate', code) || '', 'href') !== href) fail(file, `missing or incorrect hreflang=${code}`);
  }
  const mobileMenu = html.match(/<div\s+class=["']mobile-panel["']>([\s\S]*?)<\/div>/i)?.[1] || '';
  const otherLanguage = lang === 'it' ? 'en/' : '../';
  if (!tags(mobileMenu, 'a').some(t => attribute(t, 'href') === otherLanguage)) {
    fail(file, 'mobile navigation missing language switch');
  }
  const ids = [...html.matchAll(/\bid\s*=\s*(["'])([^"']+)\1/gi)].map(m => m[2]);
  const idSet = new Set(ids);
  if (idSet.size !== ids.length) fail(file, 'duplicate HTML id attributes');
  // Resolve ARIA ID references just like in-page anchors. An aria-labelledby
  // typo can silently strip the accessible name of an entire section.
  for (const tag of html.matchAll(/<([a-z][a-z0-9-]*)\\b[^>]*>/gi)) {
    for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-controls']) {
      const refs = attribute(tag[0], attr);
      if (refs === null) continue;
      if (!refs.trim()) { fail(file, `empty ${attr} reference`); continue; }
      for (const ref of refs.trim().split(/\\s+/)) {
        if (!idSet.has(ref)) fail(file, `broken ${attr} reference #${ref}`);
      }
    }
  }
  for (const tag of [...tags(html, 'a'), ...tags(html, 'img'), ...tags(html, 'link')]) {
    const tagName = tag.match(/^<([a-z]+)/i)?.[1].toLowerCase();
    const target = attribute(tag, tagName === 'img' ? 'src' : 'href');
    if (!target || /^(?:https?:|mailto:|tel:|data:|\/\/)/i.test(target)) continue;
    if (target.startsWith('#')) {
      if (!idSet.has(target.slice(1))) fail(file, `broken in-page anchor ${target}`);
      continue;
    }
    const pathname = target.split(/[?#]/)[0];
    if (!pathname || pathname.startsWith('/')) continue;
    const absolute = resolve(root, dirname(file), pathname);
    // Path separators differ on Windows and Unix. Use relative() rather than
    // comparing to root + '/' (which incorrectly rejects every Windows asset).
    const fromRoot = relative(root, absolute);
    if (fromRoot === '..' || fromRoot.startsWith('..' + sep) || isAbsolute(fromRoot)) {
      fail(file, `path escapes site: ${target}`);
      continue;
    }
    const resolvedFile = pathname.endsWith('/') ? join(absolute, 'index.html') : absolute;
    if (!existsSync(resolvedFile)) fail(file, `missing local asset/link ${target}`);
  }
  for (const img of tags(html, 'img')) {
    if (!attribute(img, 'alt')) fail(file, 'image missing nonempty alt text');
  }
  // All outbound Instagram links must point to the athlete's BJJ profile.
  const instagram = tags(html, 'a').map(tag => attribute(tag, 'href')).filter(href => href?.startsWith('https://www.instagram.com/'));
  if (!instagram.length || instagram.some(href => href !== 'https://www.instagram.com/giuliacasaldijj/')) {
    fail(file, 'unexpected or missing official BJJ Instagram profile');
  }
  const displayedHandles = [...html.matchAll(/Instagram\s+@([a-z0-9_.]+)/gi)].map(m => m[1].toLowerCase());
  if (displayedHandles.some(handle => handle !== 'giuliacasaldijj')) fail(file, 'incorrect visible Instagram handle');
  const structured = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if (structured.length !== 1) fail(file, 'expected exactly one JSON-LD block');
  for (const [, json] of structured) {
    try {
      const person = JSON.parse(json);
      if (person['@type'] !== 'Person' || person.name !== 'Giulia Casaldi') fail(file, 'unexpected JSON-LD athlete identity');
      if (!Array.isArray(person.sameAs) || !person.sameAs.every(url => /^https:\/\//.test(url))) fail(file, 'invalid sameAs URLs');
      if (person['@id'] !== base + '#athlete') fail(file, 'JSON-LD must use one stable athlete identity across languages');
      if (person.mainEntityOfPage !== canonical) fail(file, 'JSON-LD mainEntityOfPage does not match canonical');
      if (person.sameAs?.length !== 1 || person.sameAs[0] !== 'https://www.instagram.com/giuliacasaldijj/') {
        fail(file, 'sameAs must contain only the athlete-owned identity; competition result pages are citations, not identity profiles');
      }
    } catch { fail(file, 'invalid JSON-LD syntax'); }
  }
}
let sitemap;
try { sitemap = read('sitemap.xml'); } catch { fail('sitemap.xml', 'missing'); }
if (sitemap) {
  const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  const expected = pages.map(p => p.canonical);
  if (locs.length !== expected.length || !expected.every(url => locs.includes(url))) fail('sitemap.xml', 'URL set differs from language canonicals');
  for (const url of expected) {
    if (!sitemap.includes(`href="${url}"`)) fail('sitemap.xml', `missing alternate URL ${url}`);
  }
}
if (!existsSync(join(root, 'robots.txt'))) fail('robots.txt', 'missing');
if (errors.length) {
  for (const error of errors) console.error('FAIL ' + error);
  console.error(`${errors.length} static-site integrity issue(s)`);
  process.exitCode = 1;
} else {
  console.log('PASS: bilingual metadata, local links, JSON-LD, sitemap and static assets');
}
