#!/bin/bash -

c=0
l=1

while read line; do
	if [[ $c == 0 ]]; then
		c=1

		line1=$(echo "$line" | grep "\-\->")
	else
		c=0

		line2=$(echo "$line" | grep -v "\-\->")

		if [[ ! -z "${line1}" ]]; then
			echo "LINE ${l} INVALID ON LINE1! OUT: '${line1}'"
			echo "LINE ${l} INVALID ON LINE1! OUT: '${line1}'"
			echo "LINE ${l} INVALID ON LINE1! OUT: '${line1}'"
			echo "LINE ${l} INVALID ON LINE1! OUT: '${line1}'"
			echo "LINE ${l} INVALID ON LINE1! OUT: '${line1}'"
			echo "LINE ${l} INVALID ON LINE1! OUT: '${line1}'"
			break
		else
			if [[ ! -z "${line2}" ]]; then
				echo "LINE ${l} INVALID ON LINE2! OUT: '${line2}'"
				echo "LINE ${l} INVALID ON LINE2! OUT: '${line2}'"
				echo "LINE ${l} INVALID ON LINE2! OUT: '${line2}'"
				echo "LINE ${l} INVALID ON LINE2! OUT: '${line2}'"
				echo "LINE ${l} INVALID ON LINE2! OUT: '${line2}'"
				echo "LINE ${l} INVALID ON LINE2! OUT: '${line2}'"
				break
			else
				echo -en "LINE ${l} GOOD\r"
			fi
		fi
	fi

	unset line1
	unset line2

	((l++))
done < superlog.log
