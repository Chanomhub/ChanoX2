import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { findGameFolder, extractArchive, checkExtractionTools } = require('../electron/services/ExtractorService.cjs');

function mkgame(marker) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chanox2-ex-'));
  const game = path.join(root, 'Game');
  fs.mkdirSync(game, { recursive: true });
  if (marker) fs.writeFileSync(path.join(game, marker), '');
  return { root, game };
}

test('findGameFolder finds marked dir at depth 0/1/2, null when none', () => {
  for (const layout of [
    { mk: ({ root }) => root, marker: 'Game.exe' },
    { mk: ({ game }) => game, marker: 'data' },
    null, // depth 2 built inline below
  ]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chanox2-find-'));
    if (layout) {
      fs.mkdirSync(layout.mk({ root, game: path.join(root, 'Game') }), { recursive: true });
      fs.writeFileSync(path.join(layout.mk({ root, game: path.join(root, 'Game') }), layout.marker), '');
      assert.equal(findGameFolder(root), layout.mk({ root, game: path.join(root, 'Game') }));
    } else {
      const deep = path.join(root, 'a', 'b');
      fs.mkdirSync(deep, { recursive: true });
      fs.writeFileSync(path.join(deep, 'package.json'), '{}');
      assert.equal(findGameFolder(root), deep);
    }
  }

  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'chanox2-none-'));
  assert.equal(findGameFolder(empty), null);
});

test('findGameFolder skips dotfolders and stops past depth 3', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chanox2-dot-'));
  const dot = path.join(root, '.hidden');
  fs.mkdirSync(dot, { recursive: true });
  fs.writeFileSync(path.join(dot, 'Game.exe'), '');
  assert.equal(findGameFolder(root), null);

  const deep = path.join(root, 'l1', 'l2', 'l3', 'l4');
  fs.mkdirSync(deep, { recursive: true });
  fs.writeFileSync(path.join(deep, 'Game.exe'), '');
  assert.equal(findGameFolder(root), null); // depth 4 > 3
});

test('extractArchive: real zip via unzip, tar.gz, invalid zip fails loudly', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chanox2-zip-'));
  // (Linux paths only — win32/darwin extraction paths need their own OS to test)

  // real zip
  const src = path.join(root, 'payload');
  fs.mkdirSync(src);
  fs.writeFileSync(path.join(src, 'readme.txt'), 'hello');
  const zip = path.join(root, 'game.zip');
  await new Promise((res, rej) => execFile('python3',
    ['-c', `import zipfile,sys; zipfile.ZipFile(sys.argv[1],'w').write(sys.argv[2],'readme.txt')`, zip, path.join(src, 'readme.txt')],
    e => e ? rej(e) : res()));
  const zipDest = path.join(root, 'out-zip');
  await extractArchive(zip, zipDest);
  assert.equal(fs.readFileSync(path.join(zipDest, 'readme.txt'), 'utf-8'), 'hello');

  // tar.gz (real archive)
  const tgz = path.join(root, 'game.tar.gz');
  await new Promise((res, rej) => execFile('tar', ['-czf', tgz, '-C', src, 'readme.txt'], e => e ? rej(e) : res()));
  const tgzDest = path.join(root, 'out-tgz');
  await extractArchive(tgz, tgzDest);
  assert.equal(fs.readFileSync(path.join(tgzDest, 'readme.txt'), 'utf-8'), 'hello');

  // unknown extension → 7z path; garbage input must reject, never resolve silently
  fs.writeFileSync(path.join(root, 'game.bin'), 'garbage');
  await assert.rejects(extractArchive(path.join(root, 'game.bin'), path.join(root, 'out-bin')));
});

test('checkExtractionTools returns a well-formed report on this machine', () => {
  const tools = checkExtractionTools();
  assert.equal(typeof tools.zip, 'boolean');
  assert.equal(typeof tools['7z'], 'boolean');
  assert.equal(typeof tools.rar, 'boolean');
  assert.equal(Array.isArray(tools.missingInstructions), true);
  // every reported-missing tool carries Thai install instructions
  for (const m of tools.missingInstructions) {
    assert.ok(m.tool && m.instruction && Array.isArray(m.formats));
  }
});
