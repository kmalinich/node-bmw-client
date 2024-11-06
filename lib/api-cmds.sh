#!/usr/bin/env bash

SCRIPT="$(realpath "${0}")"
SCRIPT_PATH="$(dirname "${SCRIPT}")"

API_JS="${SCRIPT_PATH}/api.js"

FILE_TEMP="$(mktemp)"
#echo "FILE_TEMP : '${FILE_TEMP}'"

grep -Eo "app\..*.\('.*.'" "${API_JS}" | grep -Ev '\.all\(' | sed -e 's/app\.//g' -e 's/get(/GET\ /g' -e 's/post(/POST\ /g' | awk '{print $2, $1}' | sort | awk '{print $2, $1}' | sed 's/GET\ /GET\ \ /g' >> "${FILE_TEMP}"

if [[ "${1}" ]]; then
	grep -i "${1}" "${FILE_TEMP}"
	rm -f "${FILE_TEMP}"
	exit 0
fi

cat "${FILE_TEMP}"
rm -f "${FILE_TEMP}"
