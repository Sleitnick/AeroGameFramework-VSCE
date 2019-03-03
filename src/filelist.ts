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

export function getChildren(githubPath: string, localPath: string) {
	const paths = filelist.paths;
	const scanLoadChildren = (item: FilelistItem) => {
		const scanChildren = (parent: FilelistItem, relPath: string) => {
			if (parent.children) {
				for (const child of parent.children) {
					const _relPath = `${relPath}${child.name}${child.type === "directory" ? "/" : ""}`;
					if (child.type === "directory") {
						fsutil.createDirIfNotExist(path.join(localPath, _relPath)).then(() => {
							scanChildren(child, _relPath);
						});
					} else {
						// Create source file:
						const sourceUrl = `${URL_BASE}/${githubPath}/${_relPath}`;
						fetch(sourceUrl).then(res => res.text()).then(source => {
							const p = path.join(localPath, _relPath);
							fs.writeFile(p, source, {encoding: "utf8"}, err => {
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
	const scan = (item: FilelistItem, curpath: string) => {
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

export function loadFilelist() {
	return fetch(URL_FILELIST).then(res => res.json()).then(json => {
		filelist = json;
		exports.filelist = filelist;
	});
}