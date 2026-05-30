Code Copy
A VS Code extension that lets you quickly copy selected file contents or file paths with flexible include/exclude filters.

Features
Copy contents of selected files to the clipboard
Copy selected file paths to the clipboard
Explorer-like file tree inside the sidebar
Search files and folders
Toggle-select all visible files
Expand/collapse folders in the tree
Refresh file list from the view title bar
Open a dedicated settings page from the view title bar
Filter files using Exclude or Only include modes
Save settings locally in .vscode/code-copy.json
Sidebar Tools
The sidebar view includes:

Refresh icon in the title bar
Settings icon in the title bar
File search input
File tree with checkbox selection
Select Visible toggle button
Expand All / Collapse All button
Copy Content button
Copy Paths button
Settings
The settings page includes:

Title
Filter mode
Exclude
Only include
Exclude patterns
Only include patterns
All settings are persisted in:

bash
.vscode/code-copy.json
Build & Run
1. Install dependencies
bash
npm install
2. Compile the extension
bash
npm run compile
This compiles the TypeScript source from src/ into the out/ folder.

3. Run in development
Press F5 in VS Code to launch the Extension Development Host with the extension loaded.

Packaging
1. Install the VSCE packaging tool
bash
npm install -g @vscode/vsce
2. Create the .vsix package
bash
vsce package --allow-missing-repository
The generated .vsix file can be installed locally or published to the VS Code Marketplace.

Install the .vsix locally
bash
code --install-extension code-copy-0.0.1.vsix
License
MIT © genius-programmer.com