#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const semver = require('semver');

const pkgPath = path.join(__dirname, '..', 'package.json');

function readPkg() {
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
}

function deps(pkg) {
  return {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };
}

function getEngines(pkgName) {
  try {
    const out = execSync(`npm view ${pkgName} engines --json`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    return out ? JSON.parse(out) : null;
  } catch {
    return null;
  }
}

function minFromRange(range) {
  if (typeof range !== 'string') return null;
  return semver.minVersion(range);
}

function max(a, b) {
  if (!a) return b;
  if (!b) return a;
  return semver.gt(a, b) ? a : b;
}

function main() {
  const pkg = readPkg();
  const allDeps = deps(pkg);

  let minNode = null;
  let minNpm = null;
  const reasons = { node: new Map(), npm: new Map() };

  for (const name of Object.keys(allDeps)) {
    const eng = getEngines(name);
    if (!eng) continue;

    const nodeMin = minFromRange(eng.node);
    const npmMin = minFromRange(eng.npm);

    if (nodeMin) {
      minNode = max(minNode, nodeMin);
      reasons.node.set(name, eng.node);
    }
    if (npmMin) {
      minNpm = max(minNpm, npmMin);
      reasons.npm.set(name, eng.npm);
    }
  }

  console.log('=== Проверка engines всех зависимостей ===');
  console.log();

  if (minNode) {
    console.log(`Минимальная требуемая Node.js: ${minNode.version}`);
    console.log(`  - минимальная зависимость: ${Array.from(reasons.node.keys())[0]}`);
  } else {
    console.log('Не найдено зависимостей с engines.node.');
  }

  console.log();

  if (minNpm) {
    console.log(`Минимальная требуемая npm: ${minNpm.version}`);
    console.log(`  - минимальная зависимость: ${Array.from(reasons.npm.keys())[0]}`);
  } else {
    console.log('Не найдено зависимостей с engines.npm.');
  }

  console.log();
  console.log('Рекомендация:');
  if (minNode) console.log(`  • Установите в package.json: "engines": { "node": ">=${minNode.version}" }`);
  if (minNpm) console.log(`  • Установите в package.json: "engines": { "npm": ">=${minNpm.version}" }`);
  console.log();
}

main();
