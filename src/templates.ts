"use strict";

import * as moment from "moment";
import { workspace } from "vscode";

const templateMapping: {[env: string]: {[type: string]: Function}} = {
	"Server": {
		"Service": serviceTemplate,
		"Module": moduleTemplate
	},
	"Client": {
		"Controller": controllerTemplate,
		"Module": moduleTemplate
	},
	"Shared": {
		"Module": moduleTemplate
	}
};

function header(name: string) {
	const readableName = name.replace(/[A-Z][^A-Z]/g, s => ` ${s}`).trim();
	const author = workspace.getConfiguration("agf").get("username");
	const date = moment().format("LL");
	return `-- ${readableName}
-- ${author}
-- ${date}



`;
}

export function getTemplate(env: string, type: string, name: string) {
	if (templateMapping[env] && templateMapping[env][type]) {
		return templateMapping[env][type](name);
	} else {
		return moduleTemplate(name);
	}
}

export function serviceTemplate(name: string) {
	return `${header(name)}local ${name} = {Client = {}}


function ${name}:Start()
\t
end


function ${name}:Init()
\t
end


return ${name}`;
}

export function controllerTemplate(name: string) {
	return `${header(name)}local ${name} = {}


function ${name}:Start()
\t
end


function ${name}:Init()
\t
end


return ${name}`;
}


export function moduleTemplate(name: string) {
	return `${header(name)}local ${name} = {}


return ${name}`;
}