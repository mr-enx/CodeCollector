import * as vscode from 'vscode';

const CONFIG_DIR = '.vscode';
const CONFIG_FILE = 'code-copy.json';


type FilterMode = 'ignore' | 'showOnly';

type ExporterConfig = {
  title: string;
  mode: FilterMode;
  exclude: string;
  onlyInclude: string;
};

export function activate(context: vscode.ExtensionContext) {
  const provider = new ExporterViewProvider();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ExporterViewProvider.viewType,
      provider
    )
  );
}

export function deactivate() {}

class ExporterViewProvider implements vscode.WebviewViewProvider {
public static readonly viewType = 'codeCopy.view';

  resolveWebviewView(view: vscode.WebviewView) {
    view.webview.options = {
      enableScripts: true,
    };

    view.webview.html = getHtml();

    view.webview.onDidReceiveMessage(async (msg) => {
      try {
        if (msg.type === 'init') {
          const config = await readProjectConfig();

          view.webview.postMessage({
            type: 'loadConfig',
            config,
          });

          return;
        }

        if (msg.type === 'saveConfig') {
          await writeProjectConfig({
            title: String(msg.title || ''),
            mode: normalizeMode(msg.mode),
            exclude: String(msg.exclude || ''),
            onlyInclude: String(msg.onlyInclude || ''),
          });

          return;
        }

        if (msg.type === 'copy') {
          await this.handleCopy(view, msg);
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
      };

      await writeProjectConfig(config);

      const files = await collectFiles();

      const activeFormats =
        config.mode === 'showOnly'
          ? normalizeFormats(config.onlyInclude)
          : normalizeFormats(config.exclude);

      const filtered = files.filter((filePath) => {
        const ext = getExt(filePath);
        const hasMatch = activeFormats.includes(ext);

        if (config.mode === 'showOnly') {
          return activeFormats.length === 0 ? true : hasMatch;
        }

        return !hasMatch;
      });

      const body = filtered.join('\n');
      const title = config.title.trim();
      const output = title ? `${title}\n${body}` : body;

      await vscode.env.clipboard.writeText(output);

      view.webview.postMessage({
        type: 'done',
        count: filtered.length,
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
  };
}

async function collectFiles(): Promise<string[]> {
  const files = await vscode.workspace.findFiles(
    '**/*',
    [
      '**/node_modules/**',
      '**/.git/**',
      `**/${CONFIG_DIR}/${CONFIG_FILE}`,
    ].join(',')
  );

  return files
    .map((uri) => vscode.workspace.asRelativePath(uri, false))
    .sort((a, b) => a.localeCompare(b));
}

function normalizeFormats(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith('.') ? s : '.' + s).toLowerCase());
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



    .title {
      font-size: 13px;
      font-weight: 700;
    }
    .section {
      display: flex;
      flex-direction: column;
      gap: 6px;
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

    .primary-button {
      width: 100%;
      border: none;
      border-radius: 8px;
      padding: 10px 12px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      font-family: var(--vscode-font-family);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .primary-button:hover {
      background: var(--vscode-button-hoverBackground);
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
  </style>
</head>

<body>
  <div class="container">

    <div class="section">
      <div class="label-row">
        <label for="title">Title</label>
      </div>
      <input id="title" type="text" placeholder="Optional heading" />
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
        <span class="hint">Example: .log, .tmp</span>
      </div>
      <textarea id="exclude" placeholder=".log&#10;.tmp&#10;.map"></textarea>
    </div>

    <div class="section" id="onlyIncludeSection">
      <div class="label-row">
        <label for="onlyInclude">Only include</label>
        <span class="hint">Example: .ts, .json</span>
      </div>
      <textarea id="onlyInclude" placeholder=".ts&#10;.json"></textarea>
    </div>


    <div class="small-note">
Saved in <code>.vscode/code-copy.json</code>
    </div>

    <button id="copyBtn" class="primary-button">Copy File Paths</button>

    <div id="status" class="status"></div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    const titleEl = document.getElementById('title');
    const excludeEl = document.getElementById('exclude');
    const onlyIncludeEl = document.getElementById('onlyInclude');

    const excludeSection = document.getElementById('excludeSection');
    const onlyIncludeSection = document.getElementById('onlyIncludeSection');

    const statusEl = document.getElementById('status');
    const copyBtn = document.getElementById('copyBtn');

    let saveTimer = null;
    let isLoadingConfig = false;

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
        onlyInclude: onlyIncludeEl.value
      };
    }

    function saveConfigDebounced() {
      if (isLoadingConfig) {
        return;
      }

      clearTimeout(saveTimer);

      saveTimer = setTimeout(() => {
        vscode.postMessage({
          type: 'saveConfig',
          ...getConfigFromUI()
        });
      }, 250);
    }

    titleEl.addEventListener('input', saveConfigDebounced);
    excludeEl.addEventListener('input', saveConfigDebounced);
    onlyIncludeEl.addEventListener('input', saveConfigDebounced);

    document.querySelectorAll('input[name="mode"]').forEach((el) => {
      el.addEventListener('change', () => {
        updateModeUI();
        saveConfigDebounced();
      });
    });

    copyBtn.addEventListener('click', () => {
      clearTimeout(saveTimer);

      setStatus('Collecting files...', 'loading');

      vscode.postMessage({
        type: 'copy',
        ...getConfigFromUI()
      });
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;

      if (msg.type === 'loadConfig') {
        isLoadingConfig = true;

        const config = msg.config || {};

        titleEl.value = config.title || '';
        excludeEl.value = config.exclude || '';
        onlyIncludeEl.value = config.onlyInclude || '';

        setMode(config.mode || 'ignore');

        isLoadingConfig = false;
        setStatus('');
        return;
      }

      if (msg.type === 'done') {
        setStatus(msg.count + ' files copied.', 'success');
        return;
      }

      if (msg.type === 'error') {
        setStatus('Error: ' + msg.message, 'error');
        return;
      }
    });

    updateModeUI();

    vscode.postMessage({
      type: 'init'
    });
  </script>
</body>
</html>`;
}
