// Minimal smoke tests using Node's built-in test runner (node --test).
// No extra dependencies required. Run with: npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

test('root package.json is valid and has a semver version', () => {
  const pkg = readJson('package.json');
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  assert.deepEqual(pkg.workspaces, ['frontend', 'backend']);
});

test('frontend and backend workspace manifests parse', () => {
  const frontend = readJson('frontend/package.json');
  const backend = readJson('backend/package.json');
  assert.equal(typeof frontend.scripts.build, 'string');
  assert.equal(typeof backend.scripts.build, 'string');
});

test('backend pkg targets match CI/release platforms', () => {
  const backend = readJson('backend/package.json');
  assert.ok(backend.pkg.targets.includes('node18-win-x64'));
  assert.ok(backend.pkg.targets.includes('node18-linux-x64'));
});

test('packaging scripts referenced by workflows exist', () => {
  for (const file of ['package-app.js', 'package-release.js']) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} missing`);
  }
});

test('backend native addon build files exist', () => {
  assert.ok(fs.existsSync(path.join(root, 'backend', 'binding.gyp')));
  assert.ok(fs.existsSync(path.join(root, 'backend', 'src', 'cpp', 'nodeBridge.cpp')));
});
