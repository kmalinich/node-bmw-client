#!/usr/bin/env bash

SCRIPT="$(realpath "${0}")"
SCRIPT_PATH="$(dirname "${SCRIPT}")"

API_JS="${SCRIPT_PATH}/api.js"

grep -Eo "app\..*.\('.*.'" "${API_JS}" | grep -Ev '\.all\(' | sed -e 's/app\.//g' -e 's/get(/GET\ \ /g' -e 's/post(/POST\ /g'
