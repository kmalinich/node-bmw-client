#!/usr/bin/env bash

cd node_modules || exit 1

for FILE_V8 in $(find . -name index-v8.js); do
	FILE_V9="${FILE_V8/v8/v9}"
	if [[ ! -s "${FILE_V9}" ]]; then
		cp -fv "${FILE_V8}" "${FILE_V9}" || exit 1
	fi
done

cd .. || exit 2

if grep -q pi /etc/passwd > /dev/null 2>&1; then
	echo "Fixing permissions (pi:pi)"
	chown -R pi:pi .
fi

exit 0
