"use strict";

import * as fs from "fs";

export function doesFileExist(filepath: string) {
	return new Promise<boolean>((resolve, reject) => {
		fs.stat(filepath, err => {
			if (err) {
				if (err.code === "ENOENT") {
					resolve(false);
				} else {
					reject(err);
				}
			} else {
				resolve(true);
			}
		});
	});
}

export function createFile(filepath: string, data: string) {
	return new Promise<void>((resolve, reject) => {
		fs.writeFile(filepath, data, {encoding: "utf8"}, err => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

export function createFileIfNotExist(filepath: string, data: string) {
	return doesFileExist(filepath).then(exists => {
		if (!exists) {
			return createFile(filepath, data);
		}
	});
}

export function createDirIfNotExist(dirpath: string) {
	return doesFileExist(dirpath).then(exists => {
		if (!exists) {
			return new Promise<boolean>((resolve, reject) => {
				fs.mkdir(dirpath, err => {
					if (err) {
						reject(err);
					} else {
						resolve(true);
					}
				});
			});
		} else {
			return false;
		}
	});
}