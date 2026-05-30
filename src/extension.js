"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
var vscode = require("vscode");
var CONFIG_DIR = '.vscode';
var CONFIG_FILE = 'code-copy.json';
function activate(context) {
    var provider = new ExporterViewProvider();
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(ExporterViewProvider.viewType, provider));
}
function deactivate() { }
var ExporterViewProvider = /** @class */ (function () {
    function ExporterViewProvider() {
    }
    ExporterViewProvider.prototype.resolveWebviewView = function (view) {
        var _this = this;
        view.webview.options = {
            enableScripts: true,
        };
        view.webview.html = getHtml();
        view.webview.onDidReceiveMessage(function (msg) { return __awaiter(_this, void 0, void 0, function () {
            var config, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        if (!(msg.type === 'init')) return [3 /*break*/, 2];
                        return [4 /*yield*/, readProjectConfig()];
                    case 1:
                        config = _a.sent();
                        view.webview.postMessage({
                            type: 'loadConfig',
                            config: config,
                        });
                        return [2 /*return*/];
                    case 2:
                        if (!(msg.type === 'saveConfig')) return [3 /*break*/, 4];
                        return [4 /*yield*/, writeProjectConfig({
                                title: String(msg.title || ''),
                                mode: normalizeMode(msg.mode),
                                exclude: String(msg.exclude || ''),
                                onlyInclude: String(msg.onlyInclude || ''),
                            })];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                    case 4:
                        if (!(msg.type === 'copy')) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.handleCopy(view, msg)];
                    case 5:
                        _a.sent();
                        return [2 /*return*/];
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_1 = _a.sent();
                        view.webview.postMessage({
                            type: 'error',
                            message: String((error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || error_1),
                        });
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        }); });
    };
    ExporterViewProvider.prototype.handleCopy = function (view, msg) {
        return __awaiter(this, void 0, void 0, function () {
            var config_1, files, activeFormats_1, filtered, body, title, output, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        config_1 = {
                            title: String(msg.title || ''),
                            mode: normalizeMode(msg.mode),
                            exclude: String(msg.exclude || ''),
                            onlyInclude: String(msg.onlyInclude || ''),
                        };
                        return [4 /*yield*/, writeProjectConfig(config_1)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, collectFiles()];
                    case 2:
                        files = _a.sent();
                        activeFormats_1 = config_1.mode === 'showOnly'
                            ? normalizeFormats(config_1.onlyInclude)
                            : normalizeFormats(config_1.exclude);
                        filtered = files.filter(function (filePath) {
                            var ext = getExt(filePath);
                            var hasMatch = activeFormats_1.includes(ext);
                            if (config_1.mode === 'showOnly') {
                                return activeFormats_1.length === 0 ? true : hasMatch;
                            }
                            return !hasMatch;
                        });
                        body = filtered.join('\n');
                        title = config_1.title.trim();
                        output = title ? "".concat(title, "\n").concat(body) : body;
                        return [4 /*yield*/, vscode.env.clipboard.writeText(output)];
                    case 3:
                        _a.sent();
                        view.webview.postMessage({
                            type: 'done',
                            count: filtered.length,
                        });
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _a.sent();
                        view.webview.postMessage({
                            type: 'error',
                            message: String((error_2 === null || error_2 === void 0 ? void 0 : error_2.message) || error_2),
                        });
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ExporterViewProvider.viewType = 'codeCopy.view';
    return ExporterViewProvider;
}());
function normalizeMode(mode) {
    return mode === 'showOnly' ? 'showOnly' : 'ignore';
}
function getDefaultConfig() {
    return {
        title: '',
        mode: 'ignore',
        exclude: '.log\n.tmp\n.map',
        onlyInclude: '',
    };
}
function collectFiles() {
    return __awaiter(this, void 0, void 0, function () {
        var files;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, vscode.workspace.findFiles('**/*', [
                        '**/node_modules/**',
                        '**/.git/**',
                        "**/".concat(CONFIG_DIR, "/").concat(CONFIG_FILE),
                    ].join(','))];
                case 1:
                    files = _a.sent();
                    return [2 /*return*/, files
                            .map(function (uri) { return vscode.workspace.asRelativePath(uri, false); })
                            .sort(function (a, b) { return a.localeCompare(b); })];
            }
        });
    });
}
function normalizeFormats(raw) {
    return raw
        .split(/[\s,]+/)
        .map(function (s) { return s.trim(); })
        .filter(Boolean)
        .map(function (s) { return (s.startsWith('.') ? s : '.' + s).toLowerCase(); });
}
function getExt(filePath) {
    var base = filePath.split('/').pop() || '';
    var idx = base.lastIndexOf('.');
    if (idx <= 0) {
        return '';
    }
    return base.slice(idx).toLowerCase();
}
function getWorkspaceFolder() {
    var _a;
    return (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0];
}
function getConfigUri() {
    var folder = getWorkspaceFolder();
    if (!folder) {
        return undefined;
    }
    return vscode.Uri.joinPath(folder.uri, CONFIG_DIR, CONFIG_FILE);
}
function getConfigDirUri() {
    var folder = getWorkspaceFolder();
    if (!folder) {
        return undefined;
    }
    return vscode.Uri.joinPath(folder.uri, CONFIG_DIR);
}
function readProjectConfig() {
    return __awaiter(this, void 0, void 0, function () {
        var fallback, uri, bytes, raw, parsed, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    fallback = getDefaultConfig();
                    uri = getConfigUri();
                    if (!uri) {
                        return [2 /*return*/, fallback];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, vscode.workspace.fs.readFile(uri)];
                case 2:
                    bytes = _b.sent();
                    raw = Buffer.from(bytes).toString('utf8');
                    parsed = JSON.parse(raw);
                    return [2 /*return*/, {
                            title: typeof parsed.title === 'string' ? parsed.title : fallback.title,
                            mode: normalizeMode(parsed.mode),
                            exclude: typeof parsed.exclude === 'string' ? parsed.exclude : fallback.exclude,
                            onlyInclude: typeof parsed.onlyInclude === 'string'
                                ? parsed.onlyInclude
                                : fallback.onlyInclude,
                        }];
                case 3:
                    _a = _b.sent();
                    return [2 /*return*/, fallback];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function writeProjectConfig(config) {
    return __awaiter(this, void 0, void 0, function () {
        var dirUri, fileUri, _a, content;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    dirUri = getConfigDirUri();
                    fileUri = getConfigUri();
                    if (!dirUri || !fileUri) {
                        return [2 /*return*/];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, vscode.workspace.fs.createDirectory(dirUri)];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    return [3 /*break*/, 4];
                case 4:
                    content = JSON.stringify(config, null, 2);
                    return [4 /*yield*/, vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'))];
                case 5:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function getHtml() {
    return "\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <meta\n    http-equiv=\"Content-Security-Policy\"\n    content=\"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';\"\n  />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n\n  <style>\n    :root {\n      color-scheme: light dark;\n    }\n\n    * {\n      box-sizing: border-box;\n    }\n\n    body {\n      margin: 0;\n      padding: 14px;\n      font-family: var(--vscode-font-family);\n      color: var(--vscode-foreground);\n      background: var(--vscode-sideBar-background);\n    }\n\n    .container {\n      display: flex;\n      flex-direction: column;\n      gap: 12px;\n    }\n\n\n\n    .title {\n      font-size: 13px;\n      font-weight: 700;\n    }\n    .section {\n      display: flex;\n      flex-direction: column;\n      gap: 6px;\n    }\n\n    .label-row {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      gap: 8px;\n    }\n\n    label {\n      font-size: 12px;\n      font-weight: 600;\n      color: var(--vscode-foreground);\n    }\n\n    .hint {\n      font-size: 11px;\n      opacity: 0.7;\n    }\n\n    input[type=\"text\"],\n    textarea {\n      width: 100%;\n      border: 1px solid var(--vscode-input-border, transparent);\n      background: var(--vscode-input-background);\n      color: var(--vscode-input-foreground);\n      border-radius: 8px;\n      padding: 10px 12px;\n      font-size: 12px;\n      outline: none;\n      font-family: var(--vscode-font-family);\n    }\n\n    input[type=\"text\"]:focus,\n    textarea:focus {\n      border-color: var(--vscode-focusBorder);\n    }\n\n    textarea {\n      resize: vertical;\n      min-height: 88px;\n      line-height: 1.45;\n    }\n\n    .segmented {\n      display: grid;\n      grid-template-columns: 1fr 1fr;\n      gap: 4px;\n      padding: 4px;\n      border-radius: 10px;\n      background: var(--vscode-editorWidget-background);\n      border: 1px solid var(--vscode-widget-border, transparent);\n    }\n\n    .segmented input {\n      display: none;\n    }\n\n    .segmented label {\n      margin: 0;\n      padding: 9px 10px;\n      text-align: center;\n      border-radius: 8px;\n      cursor: pointer;\n      font-weight: 600;\n      font-size: 12px;\n      user-select: none;\n      color: var(--vscode-foreground);\n      opacity: 0.85;\n      transition: all 0.15s ease;\n    }\n\n    .segmented input:checked + label {\n      background: var(--vscode-button-background);\n      color: var(--vscode-button-foreground);\n      opacity: 1;\n    }\n\n    .segmented label:hover {\n      background: var(--vscode-list-hoverBackground);\n    }\n\n    .primary-button {\n      width: 100%;\n      border: none;\n      border-radius: 8px;\n      padding: 10px 12px;\n      cursor: pointer;\n      font-weight: 600;\n      font-size: 12px;\n      font-family: var(--vscode-font-family);\n      background: var(--vscode-button-background);\n      color: var(--vscode-button-foreground);\n    }\n\n    .primary-button:hover {\n      background: var(--vscode-button-hoverBackground);\n    }\n\n    .status {\n      min-height: 18px;\n      font-size: 12px;\n      opacity: 0.85;\n    }\n\n    .status.success {\n      color: var(--vscode-testing-iconPassed, var(--vscode-terminal-ansiGreen));\n    }\n\n    .status.error {\n      color: var(--vscode-errorForeground);\n    }\n\n    .status.loading {\n      opacity: 0.8;\n    }\n\n    .small-note {\n      font-size: 11px;\n      opacity: 0.65;\n      line-height: 1.4;\n    }\n  </style>\n</head>\n\n<body>\n  <div class=\"container\">\n\n    <div class=\"section\">\n      <div class=\"label-row\">\n        <label for=\"title\">Title</label>\n      </div>\n      <input id=\"title\" type=\"text\" placeholder=\"Optional heading\" />\n    </div>\n\n    <div class=\"section\">\n      <div class=\"label-row\">\n        <label>Filter</label>\n      </div>\n\n      <div class=\"segmented\">\n        <input type=\"radio\" id=\"mode-ignore\" name=\"mode\" value=\"ignore\" checked />\n        <label for=\"mode-ignore\">Exclude</label>\n\n        <input type=\"radio\" id=\"mode-showOnly\" name=\"mode\" value=\"showOnly\" />\n        <label for=\"mode-showOnly\">Only include</label>\n      </div>\n    </div>\n\n    <div class=\"section\" id=\"excludeSection\">\n      <div class=\"label-row\">\n        <label for=\"exclude\">Exclude</label>\n        <span class=\"hint\">Example: .log, .tmp</span>\n      </div>\n      <textarea id=\"exclude\" placeholder=\".log&#10;.tmp&#10;.map\"></textarea>\n    </div>\n\n    <div class=\"section\" id=\"onlyIncludeSection\">\n      <div class=\"label-row\">\n        <label for=\"onlyInclude\">Only include</label>\n        <span class=\"hint\">Example: .ts, .json</span>\n      </div>\n      <textarea id=\"onlyInclude\" placeholder=\".ts&#10;.json\"></textarea>\n    </div>\n\n\n    <div class=\"small-note\">\nSaved in <code>.vscode/code-copy.json</code>\n    </div>\n\n    <button id=\"copyBtn\" class=\"primary-button\">Copy File Paths</button>\n\n    <div id=\"status\" class=\"status\"></div>\n  </div>\n\n  <script>\n    const vscode = acquireVsCodeApi();\n\n    const titleEl = document.getElementById('title');\n    const excludeEl = document.getElementById('exclude');\n    const onlyIncludeEl = document.getElementById('onlyInclude');\n\n    const excludeSection = document.getElementById('excludeSection');\n    const onlyIncludeSection = document.getElementById('onlyIncludeSection');\n\n    const statusEl = document.getElementById('status');\n    const copyBtn = document.getElementById('copyBtn');\n\n    let saveTimer = null;\n    let isLoadingConfig = false;\n\n    function getMode() {\n      const selected = document.querySelector('input[name=\"mode\"]:checked');\n      return selected ? selected.value : 'ignore';\n    }\n\n    function setMode(mode) {\n      const value = mode === 'showOnly' ? 'showOnly' : 'ignore';\n      const selected = document.querySelector('input[name=\"mode\"][value=\"' + value + '\"]');\n\n      if (selected) {\n        selected.checked = true;\n      }\n\n      updateModeUI();\n    }\n\n    function updateModeUI() {\n      const mode = getMode();\n      excludeSection.style.display = mode === 'ignore' ? 'flex' : 'none';\n      onlyIncludeSection.style.display = mode === 'showOnly' ? 'flex' : 'none';\n    }\n\n    function setStatus(text, kind) {\n      statusEl.textContent = text || '';\n      statusEl.className = 'status' + (kind ? ' ' + kind : '');\n    }\n\n    function getConfigFromUI() {\n      return {\n        title: titleEl.value,\n        mode: getMode(),\n        exclude: excludeEl.value,\n        onlyInclude: onlyIncludeEl.value\n      };\n    }\n\n    function saveConfigDebounced() {\n      if (isLoadingConfig) {\n        return;\n      }\n\n      clearTimeout(saveTimer);\n\n      saveTimer = setTimeout(() => {\n        vscode.postMessage({\n          type: 'saveConfig',\n          ...getConfigFromUI()\n        });\n      }, 250);\n    }\n\n    titleEl.addEventListener('input', saveConfigDebounced);\n    excludeEl.addEventListener('input', saveConfigDebounced);\n    onlyIncludeEl.addEventListener('input', saveConfigDebounced);\n\n    document.querySelectorAll('input[name=\"mode\"]').forEach((el) => {\n      el.addEventListener('change', () => {\n        updateModeUI();\n        saveConfigDebounced();\n      });\n    });\n\n    copyBtn.addEventListener('click', () => {\n      clearTimeout(saveTimer);\n\n      setStatus('Collecting files...', 'loading');\n\n      vscode.postMessage({\n        type: 'copy',\n        ...getConfigFromUI()\n      });\n    });\n\n    window.addEventListener('message', (event) => {\n      const msg = event.data;\n\n      if (msg.type === 'loadConfig') {\n        isLoadingConfig = true;\n\n        const config = msg.config || {};\n\n        titleEl.value = config.title || '';\n        excludeEl.value = config.exclude || '';\n        onlyIncludeEl.value = config.onlyInclude || '';\n\n        setMode(config.mode || 'ignore');\n\n        isLoadingConfig = false;\n        setStatus('');\n        return;\n      }\n\n      if (msg.type === 'done') {\n        setStatus(msg.count + ' files copied.', 'success');\n        return;\n      }\n\n      if (msg.type === 'error') {\n        setStatus('Error: ' + msg.message, 'error');\n        return;\n      }\n    });\n\n    updateModeUI();\n\n    vscode.postMessage({\n      type: 'init'\n    });\n  </script>\n</body>\n</html>";
}
