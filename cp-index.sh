#!/usr/bin/env bash

cd node_modules || exit 1

for FILE_V8 in $(find . -name index-v8.js); do
	FILE_V9="${FILE_V8/v8/v9}"
	FILE_V10="${FILE_V8/v8/v10}"

	[[ ! -s "${FILE_V9}"  ]] && cp -fv "${FILE_V8}" "${FILE_V9}"
	[[ ! -s "${FILE_V10}" ]] && cp -fv "${FILE_V8}" "${FILE_V10}"
done

cd .. || exit 1

if grep -q pi /etc/passwd > /dev/null 2>&1; then
	echo "Fixing permissions (pi:pi)"
	chown -R pi: .
fi

exit 0
