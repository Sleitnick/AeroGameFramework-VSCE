export const Rojo4 = JSON.stringify({
	"name": "aerogameframework",
	"servePort": 8000,
	"partitions": {
		"ClientControllers": {
			"path": "src/Client/Controllers",
			"target": "StarterPlayer.StarterPlayerScripts.Aero.Controllers"
		},
		"ClientModules": {
			"path": "src/Client/Modules",
			"target": "StarterPlayer.StarterPlayerScripts.Aero.Modules"
		},
		"ServerModules": {
			"path": "src/Server/Modules",
			"target": "ServerStorage.Aero.Modules"
		},
		"ServerServices": {
			"path": "src/Server/Services",
			"target": "ServerStorage.Aero.Services"
		},
		"Shared": {
			"path": "src/Shared",
			"target": "ReplicatedStorage.Aero.Shared"
		},
		"_ReplicatedStorage": {
			"path": "src/_framework/rep_internal",
			"target": "ReplicatedStorage.Aero.Internal"
		},
		"_ReplicatedFirst": {
			"path": "src/_framework/rep_first",
			"target": "ReplicatedFirst.Aero"
		},
		"_ServerScriptService": {
			"path": "src/_framework/server_internal",
			"target": "ServerScriptService.Aero.Internal"
		},
		"_AeroClient": {
			"path": "src/_framework/client_internal",
			"target": "StarterPlayer.StarterPlayerScripts.Aero.Internal"
		}
	}
}, null, 2);

export const Rojo5 = JSON.stringify({
	"name": "AeroGameFramework",
	"tree": {
		"$className": "DataModel",
		"ReplicatedStorage": {
			"$className": "ReplicatedStorage",
			"Aero": {
				"$className": "Folder",
				"Shared": {
					"$path": "src/Shared"
				},
				"Internal": {
				  "$path": "src/_framework/rep_internal"
				}
			}
		},
		"ReplicatedFirst": {
			"$className": "ReplicatedFirst",
			"Aero": {
				"$path": "src/_framework/rep_first"
			}
		},
		"ServerStorage": {
			"$className": "ServerStorage",
			"Aero": {
				"$className": "Folder",
				"Modules": {
					"$path": "src/Server/Modules"
				},
				"Services": {
					"$path": "src/Server/Services"
				}
			}
		},
		"ServerScriptService": {
			"$className": "ServerScriptService",
			"Aero": {
				"$className": "Folder",
				"Internal": {
					"$path": "src/_framework/server_internal"
				}
			}
		},
		"StarterPlayer": {
			"$className": "StarterPlayer",
			"StarterPlayerScripts": {
				"$className": "StarterPlayerScripts",
				"Aero": {
					"$className": "Folder",
					"Controllers": {
						"$path": "src/Client/Controllers"
					},
					"Modules": {
						"$path": "src/Client/Modules"
					},
					"Internal": {
						"$path": "src/_framework/client_internal"
					}
				}
			}
		}
	}
}, null, 2);