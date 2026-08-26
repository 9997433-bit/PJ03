#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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

tested=0
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

  if ! package_has_script "${package_json}" test; then
    printf '[error] %-7s has no npm test script\n' "${name}" >&2
    ((failed += 1))
    continue
  fi

  printf '\n[test] %s (%s)\n' "${name}" "${game_dir}"
  if npm --prefix "${game_dir}" run test; then
    printf '[done] %s\n' "${name}"
    ((tested += 1))
  else
    printf '[error] %s test suite failed\n' "${name}" >&2
    ((failed += 1))
  fi
done

printf '\nTest summary: %d suites passed, %d skipped, %d failed.\n' \
  "${tested}" "${skipped}" "${failed}"

if ((failed > 0)); then
  exit 1
fi
