"use strict";

import * as fs from "fs";
import * as path from "path";
import * as rimraf from "rimraf";
import * as trash from "trash";
import * as log from "./log";

export enum FsFileType {
	None,
	File,
	Directory
}

export function doesFileExist(filepath: string): Promise<boolean> {
	return new Promise<boolean>((resolve, reject): void => {
		fs.stat(filepath, (err): void => {
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


export function doesAnyFileExist(filepaths: string[]): Promise<boolean> {
	const promises = filepaths.map((filepath): Promise<boolean> => doesFileExist(filepath));
	return Promise.all(promises).then((results): boolean => results.filter((result): boolean => result === true).length > 0);
}


export function getFileType(filepath: string): Promise<FsFileType> {
	return new Promise<FsFileType>((resolve, reject): void => {
		fs.stat(filepath, (err, stats): void => {
			if (err) {
				if (err.code === "ENOENT") {
					resolve(FsFileType.None);
				} else {
					reject(err);
				}
			} else if (stats.isDirectory()) {
				resolve(FsFileType.Directory);
			} else if (stats.isFile()) {
				resolve(FsFileType.File);
			} else {
				resolve(FsFileType.None);
			}
		});
	});
}


export function isDir(filepath: string): Promise<boolean> {
	return new Promise<boolean>((resolve, reject): void => {
		fs.stat(filepath, (err, stats): void => {
			if (err) {
				if (err.code === "ENOENT") {
					resolve(false);
				} else {
					reject(err);
				}
			} else {
				resolve(stats.isDirectory());
			}
		});
	});
}

export function createFile(filepath: string, data: string): Promise<void> {
	return new Promise<void>((resolve, reject): void => {
		log.info(`Creating file: ${filepath}`);
		fs.writeFile(filepath, data, {encoding: "utf8"}, (err): void => {
			if (err) {
				console.error(err);
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

export function createFileIfNotExist(filepath: string, data: string): Promise<void> {
	return doesFileExist(filepath).then((exists): Promise<void> => {
		if (!exists) {
			return createFile(filepath, data);
		}
		return Promise.resolve();
	});
}

export function createDirIfNotExist(dirpath: string): Promise<boolean> {
	return doesFileExist(dirpath).then((exists): Promise<boolean> => {
		if (!exists) {
			return new Promise<boolean>((resolve, reject): void => {
				fs.mkdir(dirpath, (err): void => {
					if (err) {
						reject(err);
					} else {
						resolve(true);
					}
				});
			});
		} else {
			return Promise.resolve(false);
		}
	});
}

export function copyFile(srcfile: string, dstfile: string): Promise<void> {
	return new Promise<void>((resolve, reject): void => {
		fs.copyFile(srcfile, dstfile, (err): void => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

export function deleteFile(filepath: string): Promise<void> {
	return trash(filepath, {glob: false})
		.then(() => log.info("TRASHED"))
		.catch((e) => log.error(e))
		.finally(() => log.info("FINALLY TRASH"));
}

export function readDir(filepath: string): Promise<string[]> {
	return new Promise<string[]>((resolve, reject): void => {
		fs.readdir(filepath, (err, files): void => {
			if (err) {
				reject(err);
			} else {
				resolve(files);
			}
		});
	});
}

export function deleteDir(filepath: string): Promise<void> {
	log.info("DELETE DIR");
	return new Promise<void>((resolve, reject): void => {
		rimraf(filepath, {disableGlob: true}, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

export function getInitFile(filepath: string): Promise<string | undefined> {
	const initFiles = ["init.lua", "init.server.lua", "init.client.lua"];
	const promises = [];
	for (const initFile of initFiles) {
		const fullPath = path.join(filepath, initFile);
		promises.push(doesFileExist(fullPath).then((exists): string | null => exists ? fullPath : null));
	}
	return Promise.all(promises).then((results): string | undefined => {
		const initFilepath = results.filter((result): boolean => result !== null)[0] || undefined;
		return initFilepath;
	});
}