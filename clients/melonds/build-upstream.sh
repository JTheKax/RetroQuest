#!/usr/bin/env bash
set -euo pipefail
# Run in MSYS2 UCRT64 after installing dependencies listed in upstream BUILD.md.
: "${MELONDS_REF:?Set MELONDS_REF to an audited upstream commit SHA}"
[[ "$MELONDS_REF" =~ ^[a-f0-9]{40}$ ]] || { echo "Full commit SHA required"; exit 1; }
dir="${1:-melonds-upstream}"
git clone --no-checkout https://github.com/melonDS-emu/melonDS.git "$dir"
git -C "$dir" checkout --detach "$MELONDS_REF"
git -C "$dir" submodule update --init --recursive
cmake -S "$dir" -B "$dir/build" -DCMAKE_BUILD_TYPE=Release
cmake --build "$dir/build" --parallel 2
echo "Upstream baseline built; RetroQuest integration is not enabled."
