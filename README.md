# Code Copy

A VS Code extension that lets you quickly copy file and folder contents with flexible include/exclude filters.

## Features

- Copy contents of files and folders to the clipboard
- Filter files using **Exclude** or **Only include** modes
- Sidebar webview UI for managing patterns
- Settings persisted in a local `code-copy.json` file

## Build & Run

### 1. Install dependencies
```bash
npm install

### 2. Compile the extension

bash
npm run compile
 dddddddddddddddddddddddddddd
This compiles the TypeScript source from `src/` into the `out/` folder.

### 3. Run in development

Press `F5` in VS Code to launch the **Extension Development Host** with the extension loaded.

## Packaging

### 1. Install the VSCE packaging tool (one time)

bash
npm install -g @vscode/vsce

### 2. Create the `.vsix` package

bash
vsce package --allow-missing-repository

The generated `.vsix` file can be installed manually or published to the Marketplace.

## Installing the `.vsix` locally

bash
code --install-extension code-copy-0.0.1.vsix

## License

MIT © [genius-programmer.com](https://genius-programmer.com)

