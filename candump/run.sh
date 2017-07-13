#!/usr/bin/env bash

DIR_BASE="${HOME}/code/nodejs/bmwcd"

export NODE_PATH="${DIR_BASE}/candump:${DIR_BASE}/candump2:${DIR_BASE}/lib:${DIR_BASE}/share:${DIR_BASE}/modules:${DIR_BASE}/node_modules:${NODE_PATH}"

node ${DIR_BASE}/candump/parse.js

