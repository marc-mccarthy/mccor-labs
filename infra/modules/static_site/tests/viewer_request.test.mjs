import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const template = readFileSync(join(import.meta.dirname, '..', 'viewer_request.js.tftpl'), 'utf8');

function loadHandler(primaryHost) {
  const code = template.replace('${jsonencode(primary_host)}', JSON.stringify(primaryHost));
  return new Function(code + '\nreturn handler;')();
}

function run(handler, host, uri, raw) {
  const request = {
    uri,
    headers: { host: { value: host } },
    querystring: {},
    rawQueryString: () => raw,
  };
  return handler({ request });
}

const handler = loadHandler('example.com');

const rewrites = [
  ['example.com', '/', undefined, '/index.html'],
  ['example.com', '/services/', undefined, '/services/index.html'],
  ['Example.COM', '/services/', undefined, '/services/index.html'],
];

const passes = [
  ['example.com', '/services/index.txt', '_rsc=x'],
  ['example.com', '/_next/static/chunks/a.js', undefined],
];

const redirects = [
  ['example.com', '/services', 'a=1', 'https://example.com/services/?a=1'],
  ['example.com', '/v1.2/foo', undefined, 'https://example.com/v1.2/foo/'],
  ['www.example.com', '/services/', 'flag', 'https://example.com/services/?flag'],
  ['www.example.com', '/services', 'a=1', 'https://example.com/services/?a=1'],
  ['d111.cloudfront.net', '/about', undefined, 'https://example.com/about/'],
  ['www.example.com', '/x', 'utm=a%20b&a=1&a=2', 'https://example.com/x/?utm=a%20b&a=1&a=2'],
  ['example.com', '/index.html', undefined, 'https://example.com/'],
  ['example.com', '/services/index.html', 'a=1', 'https://example.com/services/?a=1'],
  ['www.example.com', '/index.html', undefined, 'https://example.com/'],
];

for (const [host, uri, raw, expected] of rewrites) {
  test(`${host}${uri} rewrites to ${expected}`, () => {
    const result = run(handler, host, uri, raw);
    assert.equal(result.statusCode, undefined);
    assert.equal(result.uri, expected);
  });
}

for (const [host, uri, raw] of passes) {
  test(`${host}${uri} passes through`, () => {
    const result = run(handler, host, uri, raw);
    assert.equal(result.statusCode, undefined);
    assert.equal(result.uri, uri);
  });
}

for (const [host, uri, raw, location] of redirects) {
  test(`${host}${uri}?${raw ?? ''} 301s to ${location}`, () => {
    const result = run(handler, host, uri, raw);
    assert.equal(result.statusCode, 301);
    assert.equal(result.headers.location.value, location);
  });
}

test('mixed-case alias rendered through lower() does not redirect its own host', () => {
  const lowered = loadHandler('Example.com'.toLowerCase());
  const result = run(lowered, 'example.com', '/services/', undefined);
  assert.equal(result.statusCode, undefined);
  assert.equal(result.uri, '/services/index.html');
});

test('empty primary host keeps the request host and still enforces trailing slashes', () => {
  const open = loadHandler('');
  assert.equal(run(open, 'd111.cloudfront.net', '/services/', undefined).uri, '/services/index.html');
  const redirect = run(open, 'd111.cloudfront.net', '/about', 'a=1');
  assert.equal(redirect.statusCode, 301);
  assert.equal(redirect.headers.location.value, 'https://d111.cloudfront.net/about/?a=1');
});
