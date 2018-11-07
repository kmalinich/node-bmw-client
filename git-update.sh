#!/usr/bin/env bash

_smf() {
	git submodule foreach --recursive
}

git fetch --all --prune
git pull --rebase --prune

_smf fetch --all --prune
_smf checkout master
_smf pull --rebase --prune
