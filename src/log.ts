"use strict";

const LOG_TAG = "AGF";

export const info = (message?: any, ...optionalParams: any[]): void => {
	console.log(`${LOG_TAG} ${message || ""}`, optionalParams);
};

export const warn = (message?: any, ...optionalParams: any[]): void => {
	console.warn(`${LOG_TAG} ${message || ""}`, optionalParams);
};

export const error = (message?: any, ...optionalParams: any[]): void => {
	console.error(`${LOG_TAG} ${message || ""}`, optionalParams);
};