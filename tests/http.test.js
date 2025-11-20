import { test } from 'node:test';
import assert from 'node:assert/strict';

import { app } from '../dist/app.js';

const requests = [
  // Basic seed routes
  {
    path: '/test',
    status: 200,
    description: 'Single segment seed - SVG',
  },
  {
    path: '/john-doe',
    status: 200,
    description: 'Single segment with dash - SVG',
  },
  // Multi-segment seeds
  {
    path: '/user/john',
    status: 200,
    description: 'Two segment seed - SVG',
  },
  {
    path: '/user/john/doe',
    status: 200,
    description: 'Three segment seed - SVG',
  },
  // JSON format
  {
    path: '/test?format=json',
    status: 200,
    description: 'Single segment - JSON format',
  },
  {
    path: '/user/john?format=json',
    status: 200,
    description: 'Multi segment - JSON format',
  },
  // Query parameters (DiceBear options)
  {
    path: '/test?size=128',
    status: 200,
    description: 'With size option',
  },
  {
    path: '/test?flip=true',
    status: 200,
    description: 'With flip option',
  },
  {
    path: '/test?rotate=45',
    status: 200,
    description: 'With rotate option',
  },
  // Combined options
  {
    path: '/alice/bob?format=json&size=64',
    status: 200,
    description: 'Multi segment with format and options',
  },
];

const server = app();

for (let { path, status, description } of requests) {
  test(`${description}: ${path}`, async () => {
    const readyApp = await server;
    const response = await readyApp.inject({
      method: 'GET',
      path,
    });

    assert.equal(response.statusCode, status);

    // Additional validations
    if (status === 200) {
      if (path.includes('format=json')) {
        // JSON responses should have correct content type
        assert.match(response.headers['content-type'], /application\/json/);
        const data = JSON.parse(response.body);
        assert.ok(data.svg, 'JSON should contain svg property');
        assert.ok(data.extra, 'JSON should contain extra property');
      } else {
        // SVG responses should have correct content type
        assert.match(response.headers['content-type'], /image\/svg\+xml/);
        assert.match(response.body, /<svg/, 'Response should contain SVG');
        assert.match(response.body, /<\/svg>/, 'SVG should be complete');
      }

      // All responses should have cache control
      assert.ok(
        response.headers['cache-control'],
        'Should have cache-control header'
      );

      // All responses should have noindex
      assert.equal(response.headers['x-robots-tag'], 'noindex');
    }
  });
}

// CORS tests
test('CORS: Allowed domain (shivamdevs.com)', async () => {
  const readyApp = await app();
  const response = await readyApp.inject({
    method: 'GET',
    path: '/test',
    headers: {
      origin: 'https://shivamdevs.com',
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(
    response.headers['access-control-allow-origin'],
    'https://shivamdevs.com'
  );
});

test('CORS: Allowed subdomain (api.shivamdevs.com)', async () => {
  const readyApp = await app();
  const response = await readyApp.inject({
    method: 'GET',
    path: '/test',
    headers: {
      origin: 'https://api.shivamdevs.com',
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(
    response.headers['access-control-allow-origin'],
    'https://api.shivamdevs.com'
  );
});

test('CORS: Allowed domain (dewangan.co)', async () => {
  const readyApp = await app();
  const response = await readyApp.inject({
    method: 'GET',
    path: '/test',
    headers: {
      origin: 'https://dewangan.co',
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(
    response.headers['access-control-allow-origin'],
    'https://dewangan.co'
  );
});

test('CORS: Allowed domain (dewangans.com)', async () => {
  const readyApp = await app();
  const response = await readyApp.inject({
    method: 'GET',
    path: '/test',
    headers: {
      origin: 'https://www.dewangans.com',
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(
    response.headers['access-control-allow-origin'],
    'https://www.dewangans.com'
  );
});

test('CORS: Blocked domain (example.com)', async () => {
  const readyApp = await app();
  const response = await readyApp.inject({
    method: 'GET',
    path: '/test',
    headers: {
      origin: 'https://example.com',
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['access-control-allow-origin'], undefined);
});

test('CORS: No origin header (allowed)', async () => {
  const readyApp = await app();
  const response = await readyApp.inject({
    method: 'GET',
    path: '/test',
  });

  assert.equal(response.statusCode, 200);
});

// Seed consistency tests
test('Same seed produces same avatar', async () => {
  const readyApp = await app();
  const response1 = await readyApp.inject({
    method: 'GET',
    path: '/consistent-seed',
  });
  const response2 = await readyApp.inject({
    method: 'GET',
    path: '/consistent-seed',
  });

  assert.equal(response1.statusCode, 200);
  assert.equal(response2.statusCode, 200);
  assert.equal(
    response1.body,
    response2.body,
    'Same seed should produce identical SVG'
  );
});

test('Different seeds produce different avatars', async () => {
  const readyApp = await app();
  const response1 = await readyApp.inject({
    method: 'GET',
    path: '/seed-one',
  });
  const response2 = await readyApp.inject({
    method: 'GET',
    path: '/seed-two',
  });

  assert.equal(response1.statusCode, 200);
  assert.equal(response2.statusCode, 200);
  assert.notEqual(
    response1.body,
    response2.body,
    'Different seeds should produce different SVGs'
  );
});

test('Multi-segment seeds are different from single segment', async () => {
  const readyApp = await app();
  const response1 = await readyApp.inject({
    method: 'GET',
    path: '/test',
  });
  const response2 = await readyApp.inject({
    method: 'GET',
    path: '/test/123',
  });

  assert.equal(response1.statusCode, 200);
  assert.equal(response2.statusCode, 200);
  assert.notEqual(
    response1.body,
    response2.body,
    'Multi-segment should differ from single segment'
  );
});
