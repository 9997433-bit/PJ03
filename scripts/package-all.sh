#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZIP_DIR="${ROOT_DIR}/dist/zips"

GAME_NAMES=(mortal lanke mieyun daojun)
GAME_DIRS=(
  "${ROOT_DIR}"
  "${ROOT_DIR}/games/lanke-qiyuan"
  "${ROOT_DIR}/games/mieyun-tulu"
  "${ROOT_DIR}/games/dao-jun"
)

create_zip() {
  local source_dir="$1"
  local archive="$2"
  local temporary="${archive}.tmp.zip"

  rm -f "${temporary}"
  if command -v zip >/dev/null 2>&1; then
    (
      cd "${source_dir}"
      zip -q -r "${temporary}" .
    )
  elif command -v python3 >/dev/null 2>&1; then
    python3 - "${source_dir}" "${temporary}" <<'PY'
from pathlib import Path
import sys
import zipfile

source = Path(sys.argv[1])
archive = Path(sys.argv[2])
with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as output:
    for path in sorted(source.rglob("*")):
        if path.is_file():
            output.write(path, path.relative_to(source))
PY
  else
    printf '[error] packaging requires zip or python3\n' >&2
    return 1
  fi

  mv "${temporary}" "${archive}"
}

mkdir -p "${ZIP_DIR}"

packaged=0
skipped=0

for index in "${!GAME_NAMES[@]}"; do
  name="${GAME_NAMES[$index]}"
  game_dir="${GAME_DIRS[$index]}"
  package_json="${game_dir}/package.json"
  archive="${ZIP_DIR}/${name}.zip"

  if [[ ! -f "${package_json}" ]]; then
    rm -f "${archive}"
    printf '[skip] %-7s package not found: %s\n' "${name}" "${package_json}"
    ((skipped += 1))
    continue
  fi

  out_dir="${game_dir}/out"
  if [[ ! -d "${out_dir}" ]]; then
    printf '[error] %s is missing; run npm run build:all first\n' "${out_dir}" >&2
    exit 1
  fi

  rm -f "${archive}"
  create_zip "${out_dir}" "${archive}"
  size="$(du -h "${archive}" | awk '{print $1}')"
  printf '[done] %-7s -> %s (%s)\n' "${name}" "${archive}" "${size}"
  ((packaged += 1))
done

printf '\nPackage summary: %d archives created, %d skipped. Output: %s\n' \
  "${packaged}" "${skipped}" "${ZIP_DIR}"
