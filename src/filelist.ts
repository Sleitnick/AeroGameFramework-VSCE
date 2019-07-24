"use strict";

import fetch from "node-fetch";
import * as fs from "fs";
import * as path from "path";
import * as fsutil from "./fsutil";

const URL_BASE = "https://raw.githubusercontent.com/Sleitnick/AeroGameFramework/master/";
const URL_FILELIST = `${URL_BASE}filelist.min.json`;

interface Filelist {
	url: string;
	paths: FilelistItem;
}

interface FilelistItem {
	type: string;
	name: string;
	children?: [FilelistItem];
}

let filelist: Filelist;

export function getChildren(githubPath: string, localPath: string): void {
	const paths = filelist.paths;
	const scanLoadChildren = (item: FilelistItem): void => {
		const scanChildren = (parent: FilelistItem, relPath: string): void => {
			if (parent.children) {
				for (const child of parent.children) {
					const _relPath = `${relPath}${child.name}${child.type === "directory" ? "/" : ""}`;
					if (child.type === "directory") {
						fsutil.createDirIfNotExist(path.join(localPath, _relPath)).then((): void => {
							scanChildren(child, _relPath);
						});
					} else {
						// Create source file:
						const sourceUrl = `${URL_BASE}/${githubPath}/${_relPath}`;
						fetch(sourceUrl).then((res): Promise<string> => res.text()).then((source): void => {
							const p = path.join(localPath, _relPath);
							fs.writeFile(p, source, {encoding: "utf8"}, (err): void => {
								if (err) {
									console.error(err);
								}
							});
						});
					}
				}
			}
		};
		scanChildren(item, "");
	};
	const scan = (item: FilelistItem, curpath: string): void => {
		if (item.type === "directory") {
			curpath = `${curpath}${item.name}/`;
			if (curpath === githubPath) {
				scanLoadChildren(item);
				return;
			} else if (item.children) {
				for (const child of item.children) {
					scan(child, curpath);
				}
			}
		} else {

		}
	};
	scan(paths, "");
}

export function loadFilelist(): object {
	return fetch(URL_FILELIST).then((res): Promise<Filelist> => res.json()).then((json: Filelist): void => {
		filelist = json;
		exports.filelist = filelist;
	});
}