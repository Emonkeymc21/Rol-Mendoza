import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

// Test the generated production HTML, not the source index or the dev server.
const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('dist/rol-mendoza/index.html', root), 'utf8');
const config = JSON.parse(readFileSync(new URL('vercel.json', root), 'utf8'));
const policy = config.headers.find(rule => rule.source === '/(.*)').headers
  .find(header => header.key.toLowerCase() === 'content-security-policy').value;
const directives = new Map(policy.split(';').map(part => {
  const [name, ...sources] = part.trim().split(/\s+/);
  return [name, sources];
}));
const scriptSources = directives.get('script-src') || directives.get('default-src');
assert.ok(scriptSources, 'Production must have an explicit script policy');
assert.ok(!scriptSources.includes("'unsafe-inline'"), 'Do not allow arbitrary inline scripts');
assert.ok(!scriptSources.includes("'unsafe-eval'"), 'Do not allow eval to fix production scripts');
const hash = value => `'sha256-${createHash('sha256').update(value).digest('base64')}'`;
const document = new JSDOM(html).window.document;
let scriptCount = 0;
for (const script of document.querySelectorAll('script:not([src])')) {
  if (script.type && !['module', 'text/javascript', 'application/javascript', 'importmap'].includes(script.type)) continue;
  if (!script.textContent.trim()) continue;
  const expected = hash(script.textContent);
  assert.ok(scriptSources.includes(expected), `Built inline script is blocked by Vercel CSP: ${expected}`);
  scriptCount++;
}
for (const element of document.querySelectorAll('*')) {
  for (const attribute of element.attributes) {
    if (!/^on/i.test(attribute.name)) continue;
    const sources = directives.get('script-src-attr') || scriptSources;
    assert.ok(sources.includes("'unsafe-hashes'") && sources.includes(hash(attribute.value)),
      `Built event handler is blocked by Vercel CSP: ${attribute.name}`);
  }
}
assert.ok(document.querySelector('link[rel="stylesheet"]'), 'Production stylesheet must be emitted');
console.log(`Production CSP passed: ${scriptCount} generated inline scripts authorized by exact SHA-256.`);
