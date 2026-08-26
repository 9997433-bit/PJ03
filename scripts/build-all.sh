#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"

GAME_NAMES=(mortal lanke mieyun daojun)
GAME_DIRS=(
  "${ROOT_DIR}"
  "${ROOT_DIR}/games/lanke-qiyuan"
  "${ROOT_DIR}/games/mieyun-tulu"
  "${ROOT_DIR}/games/dao-jun"
)

package_has_script() {
  local package_json="$1"
  local script_name="$2"

  node -e '
    const pkg = require(process.argv[1]);
    process.exit(pkg.scripts?.[process.argv[2]] ? 0 : 1);
  ' "${package_json}" "${script_name}"
}

mkdir -p "${DIST_DIR}"

built=0
skipped=0
failed=0

for index in "${!GAME_NAMES[@]}"; do
  name="${GAME_NAMES[$index]}"
  game_dir="${GAME_DIRS[$index]}"
  package_json="${game_dir}/package.json"

  if [[ ! -f "${package_json}" ]]; then
    printf '[skip] %-7s package not found: %s\n' "${name}" "${package_json}"
    ((skipped += 1))
    continue
  fi

  if ! package_has_script "${package_json}" build; then
    printf '[error] %-7s has no npm build script\n' "${name}" >&2
    ((failed += 1))
    continue
  fi

  out_dir="${game_dir}/out"
  target_dir="${DIST_DIR}/${name}"
  # Never allow a previous successful export to mask a failed rebuild.
  rm -rf "${out_dir}" "${target_dir}"

  printf '\n[build] %s (%s)\n' "${name}" "${game_dir}"
  if ! npm --prefix "${game_dir}" run build; then
    printf '[error] %s build command failed\n' "${name}" >&2
    ((failed += 1))
    continue
  fi

  if [[ ! -f "${out_dir}/index.html" ]]; then
    printf '[error] %s built without producing %s/index.html\n' "${name}" "${out_dir}" >&2
    ((failed += 1))
    continue
  fi

  rm -rf "${target_dir}"
  mkdir -p "${target_dir}"
  cp -a "${out_dir}/." "${target_dir}/"
  printf '[done]  %-7s -> %s\n' "${name}" "${target_dir}"
  ((built += 1))
done

printf '\nBuild summary: %d built, %d skipped, %d failed. Output: %s\n' \
  "${built}" "${skipped}" "${failed}" "${DIST_DIR}"

if ((failed > 0)); then
  exit 1
fi
