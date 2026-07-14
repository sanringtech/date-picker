# Changesets

This directory contains changeset files that track unreleased changes to `@sanring/date-picker`.

## Workflow

1. Make your changes in a feature branch
2. Run `npm run changeset` and follow the prompts to describe what changed and whether it's a patch / minor / major bump
3. Commit the generated `.changeset/*.md` file together with your code changes
4. Open a PR — the "Require Changeset" CI check will verify a changeset exists
5. After the PR is merged, the Release workflow automatically opens a "Version Packages" PR that bumps the version and updates `CHANGELOG.md`
6. Merging the "Version Packages" PR triggers `npm run release`, which builds the library and publishes to npm

## Commands

```bash
npm run changeset          # add a new changeset (interactive)
npm run version-packages   # consume changesets → bump version + update CHANGELOG (run locally to preview)
npm run release            # build + publish (run by CI only)
```
