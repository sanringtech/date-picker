#!/usr/bin/env node
// Builds and publishes each library package, skipping any whose current
// version is already on the registry. Needed because @sanring/date-picker-core
// and @sanring/date-picker version independently (PRD
// .claude/prds/date-picker-widget.md §5) — a changeset PR often bumps only
// one of the two, and `npm publish` errors on a version that's already
// published, so this script must not blindly publish both every run.
import { execFileSync, execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const packages = [
  { project: 'date-picker-core', dist: 'dist/date-picker-core' },
  { project: 'date-picker', dist: 'dist/date-picker' },
];

for (const { project, dist } of packages) {
  execSync(`npx ng build ${project}`, { stdio: 'inherit' });

  const { name, version } = JSON.parse(readFileSync(`${dist}/package.json`, 'utf8'));

  const alreadyPublished = (() => {
    try {
      execFileSync('npm', ['view', `${name}@${version}`, 'version'], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  })();

  if (alreadyPublished) {
    console.log(`Skipping publish: ${name}@${version} is already on the registry.`);
    continue;
  }

  execSync(`npm publish ${dist} --access public`, { stdio: 'inherit' });
}
