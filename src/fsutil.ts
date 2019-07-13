"use strict";

import * as fs from "fs";

export enum FsFileType {
	None,
	File,
	Directory
}

export function doesFileExist(filepath: string): Promise<boolean> {
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

export function getFileType(filepath: string): Promise<FsFileType> {
	return new Promise<FsFileType>((resolve, reject) => {
		fs.stat(filepath, (err, stats) => {
			if (err) {
				console.error(err);
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

export function copyFile(srcfile: string, dstfile: string) {
	return new Promise<void>((resolve, reject) => {
		fs.copyFile(srcfile, dstfile, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

export function deleteFile(filepath: string) {
	return new Promise<void>((resolve, reject) => {
		fs.unlink(filepath, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

export function readDir(filepath: string) {
	return new Promise<string[]>((resolve, reject) => {
		fs.readdir(filepath, (err, files) => {
			if (err) {
				reject(err);
			} else {
				resolve(files);
			}
		});
	});
}