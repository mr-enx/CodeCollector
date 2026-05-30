import * as vscode from 'vscode';

const CONFIG_DIR = '.vscode';
const CONFIG_FILE = 'code-copy.json';

type FilterMode = 'ignore' | 'showOnly';

type ExporterConfig = {
  title: string;
  mode: FilterMode;
  exclude: string;
  onlyInclude: string;
  selectedFiles?: string[];
};

type FileTreeNode = {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
};

type Rule = {
  raw: string;
  value: string;
  kind: 'extension' | 'path';
  anywhere: boolean;
};

export function activate(context: vscode.ExtensionContext) {
  const provider = new ExporterViewProvider();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ExporterViewProvider.viewType,
      provider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codeCopy.openSettings', () => {
      provider.openSettings();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codeCopy.refreshFiles', async () => {
      await provider.refreshFiles();
    })
  );
}

export function deactivate() {}

class ExporterViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codeCopy.view';

  private view?: vscode.WebviewView;

  public openSettings() {
    if (!this.view) {
      return;
    }

    this.view.show?.(true);

    this.view.webview.postMessage({
      type: 'openSettings',
    });
  }

  public async refreshFiles() {
    if (!this.view) {
      return;
    }

    this.view.show?.(true);

    try {
      this.view.webview.postMessage({
        type: 'refreshStarted',
      });

      const config = await readProjectConfig();
      const files = await collectFiles(config);
      const tree = buildFileTree(files);

      this.view.webview.postMessage({
        type: 'filesRefreshed',
        files,
        tree,
      });
    } catch (error: any) {
      this.view.webview.postMessage({
        type: 'error',
        message: String(error?.message || error),
      });
    }
  }

  resolveWebviewView(view: vscode.WebviewView) {
    this.view = view;

    view.webview.options = {
      enableScripts: true,
    };

    view.webview.html = getHtml();

    view.webview.onDidReceiveMessage(async (msg) => {
      try {
        if (msg.type === 'init') {
          const config = await readProjectConfig();
          const files = await collectFiles(config);
          const tree = buildFileTree(files);

          view.webview.postMessage({
            type: 'loadConfig',
            config,
            files,
            tree,
          });

          return;
        }

        if (msg.type === 'refreshFiles') {
          await this.refreshFiles();
          return;
        }

        if (msg.type === 'saveConfig') {
          await writeProjectConfig({
            title: String(msg.title || ''),
            mode: normalizeMode(msg.mode),
            exclude: String(msg.exclude || ''),
            onlyInclude: String(msg.onlyInclude || ''),
            selectedFiles: Array.isArray(msg.selectedFiles)
              ? msg.selectedFiles.map(String)
              : [],
          });

          return;
        }

        if (msg.type === 'copy') {
          await this.handleCopy(view, msg);
          return;
        }

        if (msg.type === 'copyPaths') {
          await this.handleCopyPaths(view, msg);
          return;
        }
      } catch (error: any) {
        view.webview.postMessage({
          type: 'error',
          message: String(error?.message || error),
        });
      }
    });
  }

  private async handleCopy(view: vscode.WebviewView, msg: any) {
    try {
      const config: ExporterConfig = {
        title: String(msg.title || ''),
        mode: normalizeMode(msg.mode),
        exclude: String(msg.exclude || ''),
        onlyInclude: String(msg.onlyInclude || ''),
        selectedFiles: Array.isArray(msg.selectedFiles)
          ? msg.selectedFiles.map(String)
          : [],
      };

      await writeProjectConfig(config);

      const files = await collectFiles(config);
      const finalFiles = filterFilesByConfig(files, config);

      const output = await buildOutput(finalFiles);

      await vscode.env.clipboard.writeText(output);

      view.webview.postMessage({
        type: 'done',
        count: finalFiles.length,
      });
    } catch (error: any) {
      view.webview.postMessage({
        type: 'error',
        message: String(error?.message || error),
      });
    }
  }

  private async handleCopyPaths(view: vscode.WebviewView, msg: any) {
    try {
      const config: ExporterConfig = {
        title: String(msg.title || ''),
        mode: normalizeMode(msg.mode),
        exclude: String(msg.exclude || ''),
        onlyInclude: String(msg.onlyInclude || ''),
        selectedFiles: Array.isArray(msg.selectedFiles)
          ? msg.selectedFiles.map(String)
          : [],
      };

      await writeProjectConfig(config);

      const files = await collectFiles(config);
      const finalFiles = filterFilesByConfig(files, config);

      const title = config.title.trim();

      const output = title
        ? `${title}\n${finalFiles.join('\n')}`
        : finalFiles.join('\n');

      await vscode.env.clipboard.writeText(output);

      view.webview.postMessage({
        type: 'pathsDone',
        count: finalFiles.length,
      });
    } catch (error: any) {
      view.webview.postMessage({
        type: 'error',
        message: String(error?.message || error),
      });
    }
  }
}

function normalizeMode(mode: unknown): FilterMode {
  return mode === 'showOnly' ? 'showOnly' : 'ignore';
}

function getDefaultConfig(): ExporterConfig {
  return {
    title: '',
    mode: 'ignore',
    exclude: '.log\n.tmp\n.map',
    onlyInclude: '',
    selectedFiles: [],
  };
}

async function collectFiles(config?: ExporterConfig): Promise<string[]> {
  const files = await vscode.workspace.findFiles(
    '**/*',
    '{**/.git/**,**/.next/**,**/.turbo/**,**/.vscode/code-copy.json}'
  );

  const relativePaths = files
    .map((uri) => normalizePath(vscode.workspace.asRelativePath(uri, false)))
    .sort((a, b) => a.localeCompare(b));

  if (!config) {
    return relativePaths;
  }

  if (config.mode !== 'ignore') {
    return relativePaths;
  }

  const excludeRules = parseRules(config.exclude).filter(
    (rule) => rule.kind === 'path'
  );

  if (excludeRules.length === 0) {
    return relativePaths;
  }

  return relativePaths.filter((filePath) => {
    return !excludeRules.some((rule) => matchesRule(filePath, rule));
  });
}

function filterFilesByConfig(
  files: string[],
  config: ExporterConfig
): string[] {
  const rules =
    config.mode === 'showOnly'
      ? parseRules(config.onlyInclude)
      : parseRules(config.exclude);

  const filtered = files.filter((filePath) => {
    const hasMatch = rules.some((rule) => matchesRule(filePath, rule));

    if (config.mode === 'showOnly') {
      return rules.length === 0 ? true : hasMatch;
    }

    return !hasMatch;
  });

  const selectedSet = new Set(
    (config.selectedFiles || []).map((p) => normalizePath(p))
  );

  return selectedSet.size > 0
    ? filtered.filter((file) => selectedSet.has(normalizePath(file)))
    : filtered;
}

async function buildOutput(filePaths: string[]): Promise<string> {
  const folder = getWorkspaceFolder();

  if (!folder) {
    throw new Error('No workspace folder is open.');
  }

  const parts: string[] = [];

  for (const filePath of filePaths) {
    const fileUri = vscode.Uri.joinPath(folder.uri, ...filePath.split('/'));
    let content = '';

    try {
      const bytes = await vscode.workspace.fs.readFile(fileUri);
      content = Buffer.from(bytes).toString('utf8');
    } catch {
      content = '[Unable to read file]';
    }

    parts.push('============================================================');
    parts.push(`FILE: ${filePath}`);
    parts.push('============================================================');
    parts.push(content);
    parts.push('');
  }

  return parts.join('\n');
}

function buildFileTree(paths: string[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const fullPath of paths) {
    const parts = fullPath.split('/');
    let currentLevel = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = i === parts.length - 1;

      let existing = currentLevel.find((node) => node.name === part);

      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
        };

        currentLevel.push(existing);

        currentLevel.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
          }

          return a.name.localeCompare(b.name);
        });
      }

      if (!isFile) {
        currentLevel = existing.children!;
      }
    }
  }

  return root;
}

function parseRules(raw: string): Rule[] {
  return raw
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      let anywhere = false;
      let value = entry;

      if (value.startsWith('*')) {
        anywhere = true;
        value = value.slice(1).trim();
      }

      value = normalizePath(value).toLowerCase();

      const kind: 'extension' | 'path' = value.startsWith('.')
        ? 'extension'
        : 'path';

      return {
        raw: entry,
        value,
        kind,
        anywhere,
      };
    })
    .filter((rule) => !!rule.value);
}

function matchesRule(filePath: string, rule: Rule): boolean {
  const normalizedPath = normalizePath(filePath).toLowerCase();

  if (rule.kind === 'extension') {
    const ext = getExt(normalizedPath);
    return ext === rule.value;
  }

  const pathSegments = normalizedPath.split('/');

  if (rule.anywhere) {
    if (normalizedPath === rule.value) {
      return true;
    }

    if (normalizedPath.startsWith(rule.value + '/')) {
      return true;
    }

    if (normalizedPath.includes('/' + rule.value + '/')) {
      return true;
    }

    if (normalizedPath.endsWith('/' + rule.value)) {
      return true;
    }

    const singleSegmentPattern = !rule.value.includes('/');
    if (singleSegmentPattern && pathSegments.includes(rule.value)) {
      return true;
    }

    return false;
  }

  return (
    normalizedPath === rule.value ||
    normalizedPath.startsWith(rule.value + '/')
  );
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function getExt(filePath: string): string {
  const base = filePath.split('/').pop() || '';
  const idx = base.lastIndexOf('.');

  if (idx <= 0) {
    return '';
  }

  return base.slice(idx).toLowerCase();
}

function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.workspaceFolders?.[0];
}

function getConfigUri(): vscode.Uri | undefined {
  const folder = getWorkspaceFolder();

  if (!folder) {
    return undefined;
  }

  return vscode.Uri.joinPath(folder.uri, CONFIG_DIR, CONFIG_FILE);
}

function getConfigDirUri(): vscode.Uri | undefined {
  const folder = getWorkspaceFolder();

  if (!folder) {
    return undefined;
  }

  return vscode.Uri.joinPath(folder.uri, CONFIG_DIR);
}

async function readProjectConfig(): Promise<ExporterConfig> {
  const fallback = getDefaultConfig();
  const uri = getConfigUri();

  if (!uri) {
    return fallback;
  }

  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const raw = Buffer.from(bytes).toString('utf8');
    const parsed = JSON.parse(raw);

    return {
      title: typeof parsed.title === 'string' ? parsed.title : fallback.title,
      mode: normalizeMode(parsed.mode),
      exclude:
        typeof parsed.exclude === 'string' ? parsed.exclude : fallback.exclude,
      onlyInclude:
        typeof parsed.onlyInclude === 'string'
          ? parsed.onlyInclude
          : fallback.onlyInclude,
      selectedFiles: Array.isArray(parsed.selectedFiles)
        ? parsed.selectedFiles.map(String)
        : [],
    };
  } catch {
    return fallback;
  }
}

async function writeProjectConfig(config: ExporterConfig): Promise<void> {
  const dirUri = getConfigDirUri();
  const fileUri = getConfigUri();

  if (!dirUri || !fileUri) {
    return;
  }

  try {
    await vscode.workspace.fs.createDirectory(dirUri);
  } catch {
    // ignore
  }

  const content = JSON.stringify(config, null, 2);
  await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
}

function getHtml(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <style>
    :root {
      color-scheme: light dark;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 14px;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
    }

    .container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .page {
      display: none;
      flex-direction: column;
      gap: 12px;
    }

    .page.active {
      display: flex;
    }

    .section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .page-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 2px;
    }

    .page-title {
      font-size: 13px;
      font-weight: 700;
    }

    .label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    label {
      font-size: 12px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .hint {
      font-size: 11px;
      opacity: 0.7;
    }

    input[type="text"],
    textarea {
      width: 100%;
      border: 1px solid var(--vscode-input-border, transparent);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 12px;
      outline: none;
      font-family: var(--vscode-font-family);
    }

    input[type="text"]:focus,
    textarea:focus {
      border-color: var(--vscode-focusBorder);
    }

    textarea {
      resize: vertical;
      min-height: 88px;
      line-height: 1.45;
    }

    .segmented {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      padding: 4px;
      border-radius: 10px;
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-widget-border, transparent);
    }

    .segmented input {
      display: none;
    }

    .segmented label {
      margin: 0;
      padding: 9px 10px;
      text-align: center;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      user-select: none;
      color: var(--vscode-foreground);
      opacity: 0.85;
      transition: all 0.15s ease;
    }

    .segmented input:checked + label {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      opacity: 1;
    }

    .segmented label:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .primary-button,
    .secondary-button {
      width: 100%;
      border: none;
      border-radius: 8px;
      padding: 10px 12px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      font-family: var(--vscode-font-family);
    }

    .primary-button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .primary-button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .secondary-button {
      background: var(--vscode-editorWidget-background);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-widget-border, transparent);
    }

    .secondary-button:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .toggle-button.active {
      background: #ffffff;
      color: #000000;
      border-color: #ffffff;
    }

    .toolbar {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .copy-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .tree-box {
      border: 1px solid var(--vscode-widget-border, transparent);
      border-radius: 10px;
      background: var(--vscode-editorWidget-background);
      padding: 8px;
      max-height: 420px;
      overflow: auto;
    }

    .tree-node {
      margin-left: 0;
    }

    .tree-children {
      margin-left: 16px;
      border-left: 1px dashed var(--vscode-panel-border);
      padding-left: 8px;
    }

    .tree-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 2px;
      border-radius: 6px;
    }

    .tree-row:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .folder-toggle {
      cursor: pointer;
      user-select: none;
      width: 14px;
      display: inline-block;
      text-align: center;
      opacity: 0.9;
    }

    .file-spacer {
      width: 14px;
      display: inline-block;
    }

    .node-name {
      font-size: 12px;
      word-break: break-all;
    }

    .folder-name {
      font-weight: 600;
    }

    .status {
      min-height: 18px;
      font-size: 12px;
      opacity: 0.85;
    }

    .status.success {
      color: var(--vscode-testing-iconPassed, var(--vscode-terminal-ansiGreen));
    }

    .status.error {
      color: var(--vscode-errorForeground);
    }

    .status.loading {
      opacity: 0.8;
    }

    .small-note {
      font-size: 11px;
      opacity: 0.65;
      line-height: 1.4;
    }

    .selected-count {
      font-size: 11px;
      opacity: 0.75;
    }
  </style>
</head>

<body>
  <div class="container">
    <div id="mainPage" class="page active">
      <div class="section">
        <div class="label-row">
          <label for="search">Search files</label>
          <span id="selectedCount" class="selected-count">0 selected</span>
        </div>
        <input id="search" type="text" placeholder="Search file or folder..." />
      </div>

      <div class="toolbar">
        <button id="selectionToggleBtn" class="secondary-button toggle-button">Select Visible</button>
        <button id="expandAllBtn" class="secondary-button">Expand All</button>
      </div>

      <div class="section">
        <div class="label-row">
          <label>Files</label>
        </div>
        <div id="tree" class="tree-box"></div>
      </div>

      <div class="small-note">
        Settings are saved in <code>.vscode/code-copy.json</code>
      </div>

      <div class="copy-actions">
        <button id="copyBtn" class="primary-button">Copy Content</button>
        <button id="copyPathsBtn" class="secondary-button">Copy Paths</button>
      </div>

      <div id="status" class="status"></div>
    </div>

    <div id="settingsPage" class="page">
      <div class="page-title-row">
        <div class="page-title">Settings</div>
        <button id="backBtn" class="secondary-button" style="width:auto;padding:7px 10px;">Back</button>
      </div>

      <div class="section">
        <div class="label-row">
          <label for="title">Title</label>
        </div>
        <input id="title" type="text" placeholder="Only used for Copy Paths" />
      </div>

      <div class="section">
        <div class="label-row">
          <label>Filter</label>
        </div>

        <div class="segmented">
          <input type="radio" id="mode-ignore" name="mode" value="ignore" checked />
          <label for="mode-ignore">Exclude</label>

          <input type="radio" id="mode-showOnly" name="mode" value="showOnly" />
          <label for="mode-showOnly">Only include</label>
        </div>
      </div>

      <div class="section" id="excludeSection">
        <div class="label-row">
          <label for="exclude">Exclude</label>
          <span class="hint">Examples: .log, node_modules, *node_modules</span>
        </div>
        <textarea id="exclude" placeholder=".log&#10;.tmp&#10;node_modules&#10;*node_modules"></textarea>
      </div>

      <div class="section" id="onlyIncludeSection">
        <div class="label-row">
          <label for="onlyInclude">Only include</label>
          <span class="hint">Examples: .ts, .json, src/generated</span>
        </div>
        <textarea id="onlyInclude" placeholder=".ts&#10;.json"></textarea>
      </div>

      <button id="saveAndBackBtn" class="primary-button">Save and Back</button>

      <div class="small-note">
        Saved in <code>.vscode/code-copy.json</code>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    const mainPage = document.getElementById('mainPage');
    const settingsPage = document.getElementById('settingsPage');

    const titleEl = document.getElementById('title');
    const excludeEl = document.getElementById('exclude');
    const onlyIncludeEl = document.getElementById('onlyInclude');
    const searchEl = document.getElementById('search');

    const excludeSection = document.getElementById('excludeSection');
    const onlyIncludeSection = document.getElementById('onlyIncludeSection');

    const statusEl = document.getElementById('status');
    const copyBtn = document.getElementById('copyBtn');
    const copyPathsBtn = document.getElementById('copyPathsBtn');
    const treeEl = document.getElementById('tree');
    const selectedCountEl = document.getElementById('selectedCount');

    const selectionToggleBtn = document.getElementById('selectionToggleBtn');
    const expandAllBtn = document.getElementById('expandAllBtn');

    const backBtn = document.getElementById('backBtn');
    const saveAndBackBtn = document.getElementById('saveAndBackBtn');

    let saveTimer = null;
    let isLoadingConfig = false;
    let allFiles = [];
    let treeData = [];
    let selectedFiles = new Set();
    let expandedFolders = new Set();
    let selectionToggleActive = false;

    function showMainPage() {
      settingsPage.classList.remove('active');
      mainPage.classList.add('active');
    }

    function showSettingsPage() {
      mainPage.classList.remove('active');
      settingsPage.classList.add('active');
    }

    function getMode() {
      const selected = document.querySelector('input[name="mode"]:checked');
      return selected ? selected.value : 'ignore';
    }

    function setMode(mode) {
      const value = mode === 'showOnly' ? 'showOnly' : 'ignore';
      const selected = document.querySelector('input[name="mode"][value="' + value + '"]');

      if (selected) {
        selected.checked = true;
      }

      updateModeUI();
    }

    function updateModeUI() {
      const mode = getMode();
      excludeSection.style.display = mode === 'ignore' ? 'flex' : 'none';
      onlyIncludeSection.style.display = mode === 'showOnly' ? 'flex' : 'none';
    }

    function setStatus(text, kind) {
      statusEl.textContent = text || '';
      statusEl.className = 'status' + (kind ? ' ' + kind : '');
    }

    function getConfigFromUI() {
      return {
        title: titleEl.value,
        mode: getMode(),
        exclude: excludeEl.value,
        onlyInclude: onlyIncludeEl.value,
        selectedFiles: Array.from(selectedFiles)
      };
    }

    function saveConfigNow() {
      if (isLoadingConfig) {
        return;
      }

      vscode.postMessage({
        type: 'saveConfig',
        ...getConfigFromUI()
      });
    }

    function saveConfigDebounced() {
      if (isLoadingConfig) {
        return;
      }

      clearTimeout(saveTimer);

      saveTimer = setTimeout(() => {
        saveConfigNow();
      }, 250);
    }

    function updateSelectionToggleButton() {
      if (selectionToggleActive) {
        selectionToggleBtn.classList.add('active');
        selectionToggleBtn.textContent = 'Selected Visible';
      } else {
        selectionToggleBtn.classList.remove('active');
        selectionToggleBtn.textContent = 'Select Visible';
      }
    }

    function updateSelectedCount() {
      selectedCountEl.textContent = selectedFiles.size + ' selected';
      updateSelectionToggleButton();
    }

    function matchesSearch(path, search) {
      if (!search) return true;
      return path.toLowerCase().includes(search.toLowerCase());
    }

    function renderTree() {
      const search = searchEl.value.trim();
      treeEl.innerHTML = '';

      const fragment = document.createDocumentFragment();

      for (const node of treeData) {
        const el = renderNode(node, search);
        if (el) {
          fragment.appendChild(el);
        }
      }

      treeEl.appendChild(fragment);
      updateSelectedCount();
    }

    function renderNode(node, search) {
      if (node.type === 'file') {
        if (!matchesSearch(node.path, search)) {
          return null;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'tree-node';

        const row = document.createElement('div');
        row.className = 'tree-row';

        const spacer = document.createElement('span');
        spacer.className = 'file-spacer';
        spacer.textContent = '';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = selectedFiles.has(node.path);
        checkbox.addEventListener('change', () => {
          selectionToggleActive = false;

          if (checkbox.checked) {
            selectedFiles.add(node.path);
          } else {
            selectedFiles.delete(node.path);
          }

          updateSelectedCount();
          saveConfigDebounced();
        });

        const name = document.createElement('span');
        name.className = 'node-name';
        name.textContent = node.name;

        row.appendChild(spacer);
        row.appendChild(checkbox);
        row.appendChild(name);
        wrapper.appendChild(row);

        return wrapper;
      }

      const visibleChildren = (node.children || [])
        .map((child) => renderNode(child, search))
        .filter(Boolean);

      const folderMatches = matchesSearch(node.path, search);

      if (!folderMatches && visibleChildren.length === 0) {
        return null;
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'tree-node';

      const row = document.createElement('div');
      row.className = 'tree-row';

      const toggle = document.createElement('span');
      toggle.className = 'folder-toggle';

      const isExpanded = expandedFolders.has(node.path) || !!search;
      toggle.textContent = isExpanded ? '▾' : '▸';

      toggle.addEventListener('click', () => {
        if (expandedFolders.has(node.path)) {
          expandedFolders.delete(node.path);
        } else {
          expandedFolders.add(node.path);
        }

        renderTree();
      });

      const spacerCheckbox = document.createElement('span');
      spacerCheckbox.className = 'file-spacer';
      spacerCheckbox.textContent = '';

      const name = document.createElement('span');
      name.className = 'node-name folder-name';
      name.textContent = node.name;

      row.appendChild(toggle);
      row.appendChild(spacerCheckbox);
      row.appendChild(name);
      wrapper.appendChild(row);

      if (isExpanded) {
        const childrenWrap = document.createElement('div');
        childrenWrap.className = 'tree-children';
        visibleChildren.forEach((child) => childrenWrap.appendChild(child));
        wrapper.appendChild(childrenWrap);
      }

      return wrapper;
    }

    function getVisibleFilePaths(nodes, search, result = []) {
      for (const node of nodes) {
        if (node.type === 'file') {
          if (matchesSearch(node.path, search)) {
            result.push(node.path);
          }
        } else if (node.children) {
          getVisibleFilePaths(node.children, search, result);
        }
      }

      return result;
    }

    function collectFolderPaths(nodes, result = []) {
      for (const node of nodes) {
        if (node.type === 'folder') {
          result.push(node.path);

          if (node.children) {
            collectFolderPaths(node.children, result);
          }
        }
      }

      return result;
    }

    titleEl.addEventListener('input', saveConfigDebounced);
    excludeEl.addEventListener('input', saveConfigDebounced);
    onlyIncludeEl.addEventListener('input', saveConfigDebounced);

    searchEl.addEventListener('input', () => {
      selectionToggleActive = false;
      renderTree();
    });

    document.querySelectorAll('input[name="mode"]').forEach((el) => {
      el.addEventListener('change', () => {
        updateModeUI();
        saveConfigDebounced();
      });
    });

    selectionToggleBtn.addEventListener('click', () => {
      if (!selectionToggleActive) {
        const visibleFiles = getVisibleFilePaths(treeData, searchEl.value.trim());
        visibleFiles.forEach((file) => selectedFiles.add(file));
        selectionToggleActive = true;
      } else {
        selectedFiles.clear();
        selectionToggleActive = false;
      }

      renderTree();
      saveConfigDebounced();
    });

    expandAllBtn.addEventListener('click', () => {
      const folders = collectFolderPaths(treeData);
      const allExpanded = folders.every((f) => expandedFolders.has(f));

      if (allExpanded) {
        expandedFolders.clear();
      } else {
        folders.forEach((f) => expandedFolders.add(f));
      }

      renderTree();
    });

    backBtn.addEventListener('click', () => {
      clearTimeout(saveTimer);
      saveConfigNow();
      showMainPage();
    });

    saveAndBackBtn.addEventListener('click', () => {
      clearTimeout(saveTimer);
      saveConfigNow();
      showMainPage();
    });

    copyBtn.addEventListener('click', () => {
      clearTimeout(saveTimer);
      setStatus('Collecting selected files content...', 'loading');

      vscode.postMessage({
        type: 'copy',
        ...getConfigFromUI()
      });
    });

    copyPathsBtn.addEventListener('click', () => {
      clearTimeout(saveTimer);
      setStatus('Collecting selected file paths...', 'loading');

      vscode.postMessage({
        type: 'copyPaths',
        ...getConfigFromUI()
      });
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;

      if (msg.type === 'openSettings') {
        showSettingsPage();
        return;
      }

      if (msg.type === 'refreshStarted') {
        setStatus('Refreshing files...', 'loading');
        return;
      }

      if (msg.type === 'loadConfig') {
        isLoadingConfig = true;

        const config = msg.config || {};

        titleEl.value = config.title || '';
        excludeEl.value = config.exclude || '';
        onlyIncludeEl.value = config.onlyInclude || '';

        allFiles = Array.isArray(msg.files) ? msg.files : [];
        treeData = Array.isArray(msg.tree) ? msg.tree : [];
        selectedFiles = new Set(Array.isArray(config.selectedFiles) ? config.selectedFiles : []);

        selectionToggleActive = false;

        setMode(config.mode || 'ignore');

        isLoadingConfig = false;

        renderTree();
        setStatus('');
        return;
      }

      if (msg.type === 'filesRefreshed') {
        allFiles = Array.isArray(msg.files) ? msg.files : [];
        treeData = Array.isArray(msg.tree) ? msg.tree : [];
        selectionToggleActive = false;
        renderTree();
        setStatus('Files refreshed.', 'success');
        return;
      }

      if (msg.type === 'done') {
        setStatus(msg.count + ' files content copied.', 'success');
        return;
      }

      if (msg.type === 'pathsDone') {
        setStatus(msg.count + ' file paths copied.', 'success');
        return;
      }

      if (msg.type === 'error') {
        setStatus('Error: ' + msg.message, 'error');
        return;
      }
    });

    updateModeUI();
    updateSelectionToggleButton();

    vscode.postMessage({
      type: 'init'
    });
  </script>
</body>
</html>`;
}
