import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const GameCompatibility = require('../electron/services/GameCompatibility.cjs');

test('dotnet rule applies only on linux when dir (depth 1) holds .NET markers', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chanox2-compat-'));
  const exe = path.join(root, 'Game.exe');

  // empty dir → no fix
  assert.deepEqual(GameCompatibility.getEnv(exe, { useWine: true }), {});

  // marker in root
  fs.writeFileSync(path.join(root, 'System.Private.CoreLib.dll'), '');
  let env = GameCompatibility.getEnv(exe, { useWine: true });
  assert.equal(env.DOTNET_SYSTEM_GLOBALIZATION_INVARIANT, '1');

  // marker at depth 1
  fs.rmSync(path.join(root, 'System.Private.CoreLib.dll'));
  fs.mkdirSync(path.join(root, 'Binaries'), { recursive: true });
  fs.writeFileSync(path.join(root, 'Binaries', 'Foo.runtimeconfig.json'), '');
  env = GameCompatibility.getEnv(exe, { useWine: true });
  assert.equal(env.DOTNET_SYSTEM_GLOBALIZATION_INVARIANT, '1');

  // depth 2 → not scanned
  fs.rmSync(path.join(root, 'Binaries'), { recursive: true });
  fs.mkdirSync(path.join(root, 'a', 'b'), { recursive: true });
  fs.writeFileSync(path.join(root, 'a', 'b', 'X.runtimeconfig.json'), '');
  assert.deepEqual(GameCompatibility.getEnv(exe, { useWine: true }), {});

  // non-exe without useWine → skipped
  fs.rmSync(path.join(root, 'a'), { recursive: true });
  fs.writeFileSync(path.join(root, 'X.runtimeconfig.json'), '');
  assert.deepEqual(GameCompatibility.getEnv('/games/dir', {}), {});
});
