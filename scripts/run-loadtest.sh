#!/usr/bin/env bash
set -u

katalog="$(cd "$(dirname "$0")/.." && pwd)"
cd "$katalog"
mkdir -p reports

adres="${BASE_URL:-https://praktyczne-zastosowania-chmury-projekt.onrender.com}"

uruchom() {
  local rodzaj="$1"
  echo "=== ${rodzaj}: ${adres} ==="
  RODZAJ="$rodzaj" BASE_URL="$adres" k6 run loadtest/spike.js || true
}

uruchom odczyt
uruchom zapis
node scripts/build-load-report.mjs
