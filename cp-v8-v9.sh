#!/usr/bin/env bash

cd node_modules || exit 1

for FILE_V8 in $(find . -name index-v8.js); do
	FILE_V9="${FILE_V8/v8/v9}"
	if [[ ! -s "${FILE_V9}" ]]; then
		cp -fv "${FILE_V8}" "${FILE_V9}" || exit 1
	fi
done

exit 0
