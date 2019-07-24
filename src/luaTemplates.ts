"use strict";

import * as moment from "moment";
import { workspace } from "vscode";

function header(name: string): string {
	const readableName = name.replace(/[A-Z][^A-Z]/g, (s): string => ` ${s}`).trim();
	const author = workspace.getConfiguration("agf").get("username");
	const date = moment().format("LL");
	return `-- ${readableName}
-- ${author}
-- ${date}



`;
}

export function serviceTemplate(name: string): string {
	return `${header(name)}local ${name} = {Client = {}}


function ${name}:Start()
\t
end


function ${name}:Init()
\t
end


return ${name}`;
}

export function controllerTemplate(name: string): string {
	return `${header(name)}local ${name} = {}


function ${name}:Start()
\t
end


function ${name}:Init()
\t
end


return ${name}`;
}


export function moduleTemplate(name: string): string {
	return `${header(name)}local ${name} = {}


return ${name}`;
}


export function classTemplate(name: string): string {
	return `${header(name)}local ${name} = {}
${name}.__index = ${name}


function ${name}.new()

	local self = setmetatable({

	}, ${name})

	return self

end


return ${name}`;
}

const templateMapping: {[env: string]: {[type: string]: Function}} = {
	"Server": {
		"Service": serviceTemplate,
		"Module": moduleTemplate,
		"Class": classTemplate
	},
	"Client": {
		"Controller": controllerTemplate,
		"Module": moduleTemplate,
		"Class": classTemplate
	},
	"Shared": {
		"Module": moduleTemplate,
		"Class": classTemplate
	}
};

export function getTemplate(env: string, type: string, name: string): string {
	if (templateMapping[env] && templateMapping[env][type]) {
		return templateMapping[env][type](name);
	} else {
		return moduleTemplate(name);
	}
}