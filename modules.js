#!/usr/bin/env node

const fs   = require('node:fs');
const path = require('node:path');

const modules = {};

const moduleDir = path.join(__dirname, 'modules');


function isClass(fn) {
	return (typeof fn === 'function' && /^class\s/.test(Function.prototype.toString.call(fn)));
}


fs.readdirSync(moduleDir).forEach(file => {
	if (file.endsWith('.js') !== true) return;

	const moduleName = path.parse(file).name.replace('-', '_');
	const modulePath = path.join(moduleDir, file);

	let thisModule = require(modulePath);

	const moduleIsClass = isClass(thisModule);

	switch (moduleIsClass) {
		case false : modules[moduleName] = thisModule; break;
		case true  : modules[moduleName] = new (thisModule)(); break;
	}
});


module.exports = modules;
