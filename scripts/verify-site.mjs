/**
 * Offline integrity check for the two static GitHub Pages languages.
 * No network requests, dependencies, workflows or user data.
 * Run from the repository root: node scripts/verify-site.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
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
  for (const [code, href] of [['it', base], ['en', base + 'en/'], ['x-default', base]]) {
    if (attribute(headLink(html, 'alternate', code) || '', 'href') !== href) fail(file, `missing or incorrect hreflang=${code}`);
  }
  const ids = [...html.matchAll(/\bid\s*=\s*(["'])([^"']+)\1/gi)].map(m => m[2]);
  const idSet = new Set(ids);
  if (idSet.size !== ids.length) fail(file, 'duplicate HTML id attributes');
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
    if (!absolute.startsWith(root + '/') && absolute !== root) { fail(file, `path escapes site: ${target}`); continue; }
    const resolvedFile = pathname.endsWith('/') ? join(absolute, 'index.html') : absolute;
    if (!existsSync(resolvedFile)) fail(file, `missing local asset/link ${target}`);
  }
  for (const img of tags(html, 'img')) {
    if (!attribute(img, 'alt')) fail(file, 'image missing nonempty alt text');
  }
  const structured = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if (structured.length !== 1) fail(file, 'expected exactly one JSON-LD block');
  for (const [, json] of structured) {
    try {
      const person = JSON.parse(json);
      if (person['@type'] !== 'Person' || person.name !== 'Giulia Casaldi') fail(file, 'unexpected JSON-LD athlete identity');
      if (!Array.isArray(person.sameAs) || !person.sameAs.every(url => /^https:\/\//.test(url))) fail(file, 'invalid sameAs URLs');
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
