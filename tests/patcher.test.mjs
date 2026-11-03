import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const PatcherService = require('../electron/services/PatcherService.cjs');

const ORIGINAL_MAP = JSON.stringify({
  url: 'はい', // blacklisted key — must never be translated
  events: [
    null,
    {
      name: 'EV001',
      pages: [
        {
          list: [
            { code: 401, parameters: ['こんにちは'] },
            { code: 102, parameters: [['はい', 'いいえ']] },
            { code: 101, parameters: [0, 0, 0, 0, '僧侶'] },
          ],
        },
      ],
    },
  ],
}, null, 2);

const PATCH = {
  entries: [
    // exact key-path match
    { file: 'data/Map001.json', key: 'events[1].pages[0].list[0].parameters[0]', src: 'こんにちは', tgt: 'สวัสดี' },
    // key path wrong (shifted event) — must fall back to dictionary walk
    { file: 'data/Map001.json', key: 'events[99].list[0]', src: 'はい', tgt: 'ใช่' },
    { file: 'data/Map001.json', key: 'events[99].list[1]', src: '僧侶', tgt: 'นักบวช' },
    // identical src/tgt — must be skipped
    { file: 'data/Map001.json', key: 'events[1].name', src: 'EV001', tgt: 'EV001' },
  ],
};

function makeGameDir() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chanox2-patcher-'));
  fs.mkdirSync(path.join(root, 'data'), { recursive: true });
  fs.mkdirSync(path.join(root, 'fonts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'data', 'Map001.json'), ORIGINAL_MAP);
  fs.writeFileSync(path.join(root, 'fonts', 'gamefont.css'),
    '@font-face { font-family: GameFont; src: url("mplus-1p-regular.ttf"); }');
  return root;
}

async function applyAndLoad(root) {
  const res = await PatcherService.applyPatch({
    gamePath: root,
    patchPath: path.join(root, 'test.patch.json'),
    modId: 1,
  });
  const patched = JSON.parse(fs.readFileSync(path.join(root, 'data', 'Map001.json'), 'utf-8'));
  return { res, patched };
}

test('parsePath tokenizes dotted and bracket paths', () => {
  assert.deepEqual(PatcherService.parsePath('events[15].pages[0].list[2].parameters[0]'),
    ['events', 15, 'pages', 0, 'list', 2, 'parameters', 0]);
  assert.deepEqual(PatcherService.parsePath('[10].name'), [10, 'name']);
  assert.deepEqual(PatcherService.parsePath('name'), ['name']);
  assert.deepEqual(PatcherService.parsePath(''), []);
});

test('setPathValue sets nested value and refuses mismatched source', () => {
  const obj = { events: [{ name: 'a' }] };
  assert.equal(PatcherService.setPathValue(obj, ['events', 0, 'name'], 'b', 'a'), true);
  assert.equal(obj.events[0].name, 'b');
  assert.equal(PatcherService.setPathValue(obj, ['events', 0, 'name'], 'c', 'WRONG'), false);
  assert.equal(obj.events[0].name, 'b');
  assert.equal(PatcherService.setPathValue(obj, ['missing', 'x'], 'c'), false);
  assert.equal(PatcherService.setPathValue({ a: 5 }, ['a', 'b'], 'c'), false);
  assert.equal(PatcherService.setPathValue(null, ['a'], 'c'), false);
});

test('loadPatch reads plain and gzipped patch files, throws when missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chanox2-patch-'));
  const plain = path.join(dir, 'a.patch.json');
  fs.writeFileSync(plain, JSON.stringify(PATCH));
  assert.deepEqual(PatcherService.loadPatch(plain), PATCH);

  const gz = path.join(dir, 'a.patch.json.gz');
  fs.writeFileSync(gz, zlib.gzipSync(JSON.stringify(PATCH)));
  assert.deepEqual(PatcherService.loadPatch(gz), PATCH);

  assert.throws(() => PatcherService.loadPatch(path.join(dir, 'nope.patch.json')), /not found/);
});

test('findGameDirs locates www/data, data, and one-level-deep data', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chanox2-dirs-'));
  fs.mkdirSync(path.join(root, 'www', 'data'), { recursive: true });
  assert.equal(PatcherService.findGameDirs(root).dataDir, path.join(root, 'www', 'data'));

  fs.rmSync(path.join(root, 'www'), { recursive: true });
  fs.mkdirSync(path.join(root, 'data'), { recursive: true });
  assert.equal(PatcherService.findGameDirs(root).dataDir, path.join(root, 'data'));

  fs.rmSync(path.join(root, 'data'), { recursive: true });
  fs.mkdirSync(path.join(root, 'Sub', 'data'), { recursive: true });
  assert.equal(PatcherService.findGameDirs(root).dataDir, path.join(root, 'Sub', 'data'));

  assert.equal(PatcherService.findGameDirs(fs.mkdtempSync(path.join(os.tmpdir(), 'chanox2-empty-'))).dataDir, null);
});

test('applyPatch: exact match, dictionary fallback, blacklist, backups, font', async () => {
  const root = makeGameDir();
  const patchPath = path.join(root, 'test.patch.json');
  fs.writeFileSync(patchPath, JSON.stringify(PATCH));

  const { res, patched } = await applyAndLoad(root);

  assert.equal(res.success, true);
  assert.equal(res.totalPatchedEntries, 3); // exact 1 + dict 2; src==tgt entry skipped
  assert.equal(res.filesModified, 1);
  assert.equal(res.fontInjected, true);

  const list = patched.events[1].pages[0].list;
  assert.equal(list[0].parameters[0], 'สวัสดี'); // exact path
  assert.deepEqual(list[1].parameters[0], ['ใช่', 'いいえ']); // dict fallback on choices
  assert.equal(list[2].parameters[4], 'นักบวช'); // dict fallback on speaker
  assert.equal(patched.url, 'はい'); // blacklisted key untouched
  assert.equal(patched.events[1].name, 'EV001'); // src==tgt skipped

  // backup holds the original bytes
  const backupDir = path.join(root, '.chanox2', 'backups', res.backupId);
  assert.equal(fs.readFileSync(path.join(backupDir, 'Map001.json'), 'utf-8'), ORIGINAL_MAP);
  const manifest = JSON.parse(fs.readFileSync(path.join(backupDir, 'backup-manifest.json'), 'utf-8'));
  assert.equal(manifest.modId, 1);
  assert.equal(manifest.totalPatchedEntries, 3);
  assert.equal(manifest.fontInjected, true);

  // Thai font injected in front of the original font url
  const css = fs.readFileSync(path.join(root, 'fonts', 'gamefont.css'), 'utf-8');
  assert.match(css, /src:\s*url\("NotoSansThai-Regular\.ttf"\),\s*url\("mplus-1p-regular\.ttf"\)/);
  assert.ok(fs.existsSync(path.join(root, 'fonts', 'NotoSansThai-Regular.ttf')));

  const backups = PatcherService.getModBackups({ gamePath: root, modId: 1 });
  assert.equal(backups.length, 1);
  assert.equal(backups[0].id, res.backupId);
  assert.equal(backups[0].patchedEntries, 3);
});

test('applyPatch skips entries whose file is missing from the game', async () => {
  const root = makeGameDir();
  const patch = { entries: [{ file: 'data/Gone.json', key: 'a', src: 'x', tgt: 'y' }] };
  const patchPath = path.join(root, 'test.patch.json');
  fs.writeFileSync(patchPath, JSON.stringify(patch));

  const res = await PatcherService.applyPatch({ gamePath: root, patchPath, modId: 2 });
  assert.equal(res.totalPatchedEntries, 0);
  assert.equal(res.filesModified, 0);
});

test('applyPatch rejects invalid patch packages', async () => {
  const root = makeGameDir();
  const patchPath = path.join(root, 'bad.patch.json');
  fs.writeFileSync(patchPath, JSON.stringify({ nope: true }));
  await assert.rejects(
    PatcherService.applyPatch({ gamePath: root, patchPath, modId: 1 }),
    /invalid entries list/,
  );
});

test('rollbackPatch restores originals and removes injected font', async () => {
  const root = makeGameDir();
  const patchPath = path.join(root, 'test.patch.json');
  fs.writeFileSync(patchPath, JSON.stringify(PATCH));

  const { res } = await applyAndLoad(root);
  await PatcherService.rollbackPatch({ gamePath: root, backupId: res.backupId });

  assert.equal(fs.readFileSync(path.join(root, 'data', 'Map001.json'), 'utf-8'), ORIGINAL_MAP);
  assert.equal(fs.readFileSync(path.join(root, 'fonts', 'gamefont.css'), 'utf-8'),
    '@font-face { font-family: GameFont; src: url("mplus-1p-regular.ttf"); }');
  assert.equal(fs.existsSync(path.join(root, 'fonts', 'NotoSansThai-Regular.ttf')), false);
  assert.ok(fs.existsSync(path.join(root, '.chanox2', 'backups', res.backupId, 'backup-manifest.json.rolledback')));

  await assert.rejects(
    PatcherService.rollbackPatch({ gamePath: root, backupId: 'mod_1_1' }),
    /manifest not found/,
  );
});

test('getModBackups ignores other mods and malformed manifests', async () => {
  const root = makeGameDir();
  const backupsRoot = path.join(root, '.chanox2', 'backups');
  fs.mkdirSync(path.join(backupsRoot, 'mod_7_100'), { recursive: true });
  fs.writeFileSync(path.join(backupsRoot, 'mod_7_100', 'backup-manifest.json'),
    JSON.stringify({ timestamp: 100, backedUpFiles: [], totalPatchedEntries: 5 }));
  fs.mkdirSync(path.join(backupsRoot, 'mod_7_200'), { recursive: true });
  fs.writeFileSync(path.join(backupsRoot, 'mod_7_200', 'backup-manifest.json'), 'not json');
  fs.mkdirSync(path.join(backupsRoot, 'mod_7_300'), { recursive: true }); // no manifest

  const backups = PatcherService.getModBackups({ gamePath: root, modId: 7 });
  assert.equal(backups.length, 1);
  assert.equal(backups[0].id, 'mod_7_100');
  assert.equal(backups[0].patchedEntries, 5);
  assert.deepEqual(PatcherService.getModBackups({ gamePath: root, modId: 8 }), []);
});
