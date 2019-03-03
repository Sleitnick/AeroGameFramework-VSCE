# AeroGameFramework VSCode Extension

The official VS Code extension for the [AeroGameFramework](https://github.com/Sleitnick/AeroGameFramework).

## Usage

### Getting Started
Be sure to install [Rojo](https://github.com/LPGhatguy/rojo), which will sync source files into Roblox Studio.

### Create new project

1. Create a new directory for your source files to live
1. Open the directory in VS Code
1. From the command panel (`Ctrl+Shift+P`), run `AeroGameFramework: Init`
1. If using the Rojo VS Code extension, restart Visual Studio Code
1. Start Rojo and run the Rojo plugin within Roblox Studio

### Creating new source files (Services, Controllers, and Modules)

1. Right-click within the Explorer and click on `AeroGameFramework: Create` from the context menu.
1. Select whether the source file should exist within the Server, Client, or Shared
1. Select the source type (e.g. Service, Controller, or Module)
1. Type in the name & press Enter

### Directory Structure

- `src`: Where all the source files live.
  - `Client`: All the client-side code.
    - `Controllers`: Client-side singleton controllers.
	- `Modules`: Lazy-loaded plain modules.
  - `Server`: All the server-side code.
    - `Services`: Server-side singleton services.
	- `Modules`: Lazy-loaded plain modules.
  - `Shared`: Lazy-loaded plain modules shared between the client and server.
  - `_framework`: Internal AeroGameFramework source files. Hidden in VS Code.

**Note:** The `rojo.json` file is specifically configured to work with the directory structure described above. Changing the structure may break Rojo from properly syncing changes into Roblox Studio.

## Features

- Create new AeroGameFramework projects
- Generates boilerplate code for framework services, controllers, and modules
- Includes Rojo configuration file for quick synchronization with Roblox Studio
- Includes Luacheck configuration file

## Requirements

#### Required:
- [Rojo](https://github.com/LPGhatguy/rojo)

#### Recommended:
- [Rojo for VS Code](https://marketplace.visualstudio.com/items?itemName=evaera.vscode-rojo)
- [Luacheck](https://github.com/mpeterv/luacheck)
- [vscode-lua](https://marketplace.visualstudio.com/items?itemName=trixnz.vscode-lua)

## Acknowledgements

- [LPGhatguy](https://github.com/LPGhatguy) (Rojo)
- [evaera](https://github.com/evaera) (Rojo VSC Extension)

## Known Issues

- No issues reported

## Release Notes

### Alpha 0.0.3

- Documentation

### Alpha 0.0.2

- Init sequence now includes `.luacheckrc` file

### Alpha 0.0.1

- Initial release