#!/usr/bin/env bash
# Re-pulls the shared design tokens from @sanring/ui, replacing the old
# manual `cp` workflow. Prefers a local sibling checkout (../ui) so it works
# offline when both repos are cloned side by side; falls back to the
# published registry on GitHub otherwise.
set -euo pipefail

DEST="projects/docs/src/sanring-theme.css"
LOCAL_SRC="../ui/registry/shared/theme.css"
REMOTE_SRC="https://raw.githubusercontent.com/sanringtech/ui/main/registry/shared/theme.css"

if [ -f "$LOCAL_SRC" ]; then
  cp "$LOCAL_SRC" "$DEST"
  echo "Synced $DEST from local checkout: $LOCAL_SRC"
else
  curl -fsSL "$REMOTE_SRC" -o "$DEST"
  echo "Synced $DEST from $REMOTE_SRC"
fi
