#!/usr/bin/env bash
# Packages the built dist/ into per-wave zip files for phased upload.
set -e
cd "$(dirname "$0")/.."
mkdir -p packages
rm -f packages/*.zip
cd dist
zip -q ../packages/wave-1-foundation.zip -@ < _wave1.txt
zip -q ../packages/wave-2-industries.zip -@ < _wave2.txt
zip -q ../packages/wave-3-longtail.zip -@ < _wave3.txt
cd ..
echo "Packages created:"
ls -lh packages
