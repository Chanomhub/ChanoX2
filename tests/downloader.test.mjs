import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ParallelDownloader = require('../electron/services/ParallelDownloader.cjs');

const HTML = '<!doctype html><html><body>ok</body></html>\n';
const BIG = Buffer.alloc(25 * 1024 * 1024); // 25MB → 3 chunks at 10MB
for (let i = 0; i < BIG.length; i++) BIG[i] = i & 0xff;

function makeWin(events) {
  return {
    isDestroyed: () => false,
    webContents: { send: (ch, payload) => events.push([ch, payload]) },
  };
}

function startServer(handler) {
  return new Promise((resolve) => {
    const srv = require('node:http').createServer(handler);
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function makeDownloader(dir, events) {
  let nextId = 0;
  return new ParallelDownloader(makeWin(events), dir, new Map(), () => ++nextId);
}

test('getFilenameFromUrl: Content-Disposition, RFC5987, URL basename, fallback', () => {
  const d = new ParallelDownloader(null, '/tmp', new Map(), () => 1);
  assert.equal(d.getFilenameFromUrl('http://x/y', 'attachment; filename="Game.zip"'), 'Game.zip');
  assert.equal(d.getFilenameFromUrl('http://x/y', "attachment; filename*=UTF-8''%E0%B9%80%E0%B8%81%E0%B8%A1.zip"), 'เกม.zip');
  assert.equal(d.getFilenameFromUrl('http://x/path/Game%20Set.zip'), 'Game%20Set.zip'); // no unescape on URL path — documents current behavior
  assert.match(d.getFilenameFromUrl('http://x/', null), /^download-[0-9a-f]{8}$/);
});

test('reportProgress throttles to 500ms but always fires on completion', () => {
  const events = [];
  const d = makeDownloader('/tmp', events);
  const info = {
    id: 1, receivedBytes: 0, totalBytes: 100,
    lastReportTime: Date.now(), lastReceivedBytes: 0,
  };

  d.reportProgress(info); // first tick, <500ms since start → throttled
  assert.equal(events.length, 0);

  info.receivedBytes = 100; // completion must bypass throttle
  d.reportProgress(info);
  assert.equal(events.length, 1);
  assert.equal(events[0][0], 'download-progress');
  assert.equal(events[0][1].receivedBytes, 100);
  assert.equal(events[0][1].speed, 0); // bytesDiff==0 elapsed-based; 0/anything
});

test('single-stream download: file lands complete, progress + complete events fire', async () => {
  const events = [];
  const srv = await startServer((req, res) => {
    res.writeHead(200, { 'Content-Length': Buffer.byteLength(HTML) });
    res.end(HTML);
  });
  try {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chanox2-dl-'));
    const d = makeDownloader(dir, events);
    await d.download(srvUrl(srv, '/f.html'), {}, { filename: 'f.html' });

    const saved = path.join(dir, 'f.html');
    assert.equal(fs.readFileSync(saved, 'utf-8'), HTML);
    assert.equal(events.filter(e => e[0] === 'download-started').length, 1);
    assert.equal(events.filter(e => e[0] === 'download-complete').length, 1);
    assert.equal(events.filter(e => e[0] === 'download-error').length, 0);
    assert.equal([...d.activeDownloads.keys()].length, 0); // cleaned up
  } finally {
    srv.close();
  }
});

test('parallel download: 25MB in 3 range chunks reassembles byte-perfect', async () => {
  const events = [];
  const chunkHits = [];
  const srv = await startServer((req, res) => {
    if (req.method === 'HEAD') {
      res.writeHead(200, {
        'Content-Length': BIG.length,
        'Accept-Ranges': 'bytes',
      });
      return res.end();
    }
    const range = req.headers.range;
    if (!range) {
      res.writeHead(200, { 'Content-Length': BIG.length });
      return res.end(BIG);
    }
    chunkHits.push(range);
    const m = range.match(/bytes=(\d+)-(\d+)/);
    const start = +m[1], end = +m[2];
    res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${BIG.length}` });
    res.end(BIG.subarray(start, end + 1));
  });
  try {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chanox2-dl-'));
    const d = makeDownloader(dir, events);
    await d.download(srvUrl(srv, '/big.bin'), {}, { filename: 'big.bin' });

    const saved = fs.readFileSync(path.join(dir, 'big.bin'));
    assert.equal(saved.length, BIG.length);
    assert.ok(saved.equals(BIG), 'chunk reassembly must be byte-perfect');
    assert.equal(chunkHits.length, 3); // 3 range requests, not a full GET
    assert.equal(events.filter(e => e[0] === 'download-complete').length, 1);

    const info = events.find(e => e[0] === 'download-started')[1];
    assert.equal(info.totalBytes, BIG.length);
  } finally {
    srv.close();
  }
});

test('cancelled download reports download-error and clears activeDownloads', async () => {
  const events = [];
  // server that trickles forever
  const srv = await startServer((req, res) => {
    res.writeHead(200, { 'Content-Length': 10 ** 9 });
    res.write('x');
    const t = setInterval(() => res.write('x'), 50);
    req.on('close', () => clearInterval(t));
  });
  try {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chanox2-dl-'));
    const d = makeDownloader(dir, events);
    const p = d.download(srvUrl(srv, '/slow.bin'), {}, { filename: 'slow.bin' });
    await new Promise(r => setTimeout(r, 150));
    const [id] = [...d.activeDownloads.keys()];
    d.activeDownloads.get(id).cancel();
    await p;

    assert.equal(events.filter(e => e[0] === 'download-error').length, 1);
    assert.equal(events.at(-1)[1].error, 'Download cancelled');
    assert.equal([...d.activeDownloads.keys()].length, 0);
  } finally {
    srv.close();
  }
});

test('server error (404) surfaces as download-error, no file written', async () => {
  const events = [];
  const srv = await startServer((req, res) => {
    if (req.url === '/missing.bin') {
      res.writeHead(404, { 'Content-Length': 0 });
      return res.end();
    }
    res.writeHead(200, { 'Content-Length': 5 });
    res.end('hello');
  });
  try {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chanox2-dl-'));
    const d = makeDownloader(dir, events);
    await d.download(srvUrl(srv, '/missing.bin'), {}, { filename: 'missing.bin' });

    const err = events.find(e => e[0] === 'download-error');
    assert.ok(err, 'must emit download-error');
    assert.match(err[1].error, /404/);
    assert.equal(fs.existsSync(path.join(dir, 'missing.bin')), false);
  } finally {
    srv.close();
  }
});

test('HEAD 405 falls back to GET Range 0-0 for file info', async () => {
  const events = [];
  let sawRange = false;
  const srv = await startServer((req, res) => {
    if (req.method === 'HEAD') {
      res.writeHead(405);
      return res.end();
    }
    if (req.headers.range === 'bytes=0-0') {
      sawRange = true;
      res.writeHead(206, { 'Content-Range': `bytes 0-0/${HTML.length}` });
      return res.end(HTML[0]);
    }
    res.writeHead(200, { 'Content-Length': HTML.length });
    res.end(HTML);
  });
  try {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chanox2-dl-'));
    const d = makeDownloader(dir, events);
    await d.download(srvUrl(srv, '/f.html'), {}, { filename: 'f.html' });
    assert.equal(sawRange, true);
    assert.equal(fs.readFileSync(path.join(dir, 'f.html'), 'utf-8'), HTML);
  } finally {
    srv.close();
  }
});

function srvUrl(srv, p) {
  return `http://127.0.0.1:${srv.address().port}${p}`;
}
