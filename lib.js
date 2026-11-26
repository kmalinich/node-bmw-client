#!/usr/bin/env node

const fs   = require('node:fs');
const path = require('node:path');

const modules = {};

const moduleDirLib   = path.join(__dirname, 'lib');
const moduleDirShare = path.join(__dirname, 'share');


function isClass(fn) {
	return (typeof fn === 'function' && /^class\s/.test(Function.prototype.toString.call(fn)));
}

function loadModule(moduleDir, file, override = false) {
	if (file.endsWith('.js') !== true) return;

	if (file.includes('-default') === true) return;

	if (override === false) {
		switch (file) {
			case 'bus.js'  :
			case 'json.js' : return;
		}
	}

	switch (file) {
		case 'bus-arbids.js'  :
		case 'bus-cmds.js'    :
		case 'bus-data.js'    :
		case 'bus-modules.js' : return;
	}

	const moduleName = path.parse(file).name.replace(/-/g, '_');
	// console.log(`${moduleDir} / ${file} -> ${moduleName}`);

	const modulePath = path.join(moduleDir, file);

	let thisModule = require(modulePath);

	const moduleIsClass = isClass(thisModule);

	switch (moduleIsClass) {
		case false : modules[moduleName] = thisModule; break;
		case true  : modules[moduleName] = new (thisModule)(); break;
	}
}


fs.readdirSync(moduleDirLib).forEach(file   => { loadModule(moduleDirLib,   file); });
fs.readdirSync(moduleDirShare).forEach(file => { loadModule(moduleDirShare, file); });

loadModule(moduleDirShare, 'bus.js',  true);
loadModule(moduleDirLib,   'json.js', true);

module.exports = modules;
