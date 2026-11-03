import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  parseLaunchGameArg,
  parseProtocolUrl,
  loadJsonFile,
  saveJsonFile,
  parseIni,
  serializeIni,
} = require('../electron/lib/parsers.cjs');

test('parseLaunchGameArg extracts value and survives "=" inside the game path', () => {
  assert.equal(parseLaunchGameArg(['--launch-game=/home/u/My Game/exe']), '/home/u/My Game/exe');
  assert.equal(parseLaunchGameArg(['--launch-game=/opt/a=b/game.exe']), '/opt/a=b/game.exe');
  assert.equal(parseLaunchGameArg(['--other', '--launch-game=x']), 'x');
  assert.equal(parseLaunchGameArg(['--nope']), null);
  assert.equal(parseLaunchGameArg([]), null);
});

test('parseProtocolUrl pulls chanox2:// out of surrounding noise', () => {
  assert.equal(parseProtocolUrl(['chanox2://article/slug-HJ1']), 'chanox2://article/slug-HJ1');
  assert.equal(parseProtocolUrl(['/usr/bin/app chanox2://editor/foo?x=1']), 'chanox2://editor/foo?x=1');
  assert.equal(parseProtocolUrl(['nothing here']), null);
});

test('loadJsonFile returns default on missing file, corrupt JSON, and array default', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chanox2-parse-'));
  try {
    const missing = path.join(dir, 'nope.json');
    assert.deepEqual(loadJsonFile(missing), {});
    assert.deepEqual(loadJsonFile(missing, []), []);

    const bad = path.join(dir, 'bad.json');
    fs.writeFileSync(bad, '{not json');
    assert.deepEqual(loadJsonFile(bad, { fallback: true }), { fallback: true });

    const good = path.join(dir, 'good.json');
    fs.writeFileSync(good, JSON.stringify({ a: 1 }));
    assert.deepEqual(loadJsonFile(good), { a: 1 });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('saveJsonFile round-trips and reports failure without throwing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chanox2-parse-'));
  try {
    const file = path.join(dir, 'out.json');
    assert.equal(saveJsonFile(file, { nested: { ok: true } }), true);
    assert.deepEqual(loadJsonFile(file), { nested: { ok: true } });

    // unreadable path → false, not a throw (settings saves must not crash the app)
    assert.equal(saveJsonFile(path.join(dir, 'gone', 'x.json'), {}), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('parseIni reads QSettings-style flat sections; blank lines and CRLF tolerated', () => {
  const ini = parseIni('[General]\r\nfont=Noto Sans Thai\r\n\r\n[Plugins]\r\nLingo_TranslationLayer=1\r\n');
  assert.deepEqual(ini, {
    General: { font: 'Noto Sans Thai' },
    Plugins: { Lingo_TranslationLayer: '1' },
  });
  // keys before any section are ignored (documents current behavior)
  assert.deepEqual(parseIni('loose=1\n[General]\nfont=x'), { General: { font: 'x' } });
  assert.deepEqual(parseIni(null), {});
});

test('serializeIni → parseIni round-trips', () => {
  const src = {
    General: { font: 'Thai', size: '14' },
    LLM: { provider: 'openai', 'base-url': 'http://127.0.0.1:8457/v1' },
  };
  assert.deepEqual(parseIni(serializeIni(src)), src);
  assert.match(serializeIni(src), /\[General\]\nfont=Thai\nsize=14\n\n\[LLM\]\n/);
  assert.match(serializeIni(src), /\n$/);
});
