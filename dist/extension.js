"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode2 = __toESM(require("vscode"));
var fs = __toESM(require("fs"));

// src/auth/index.ts
var vscode = __toESM(require("vscode"));
var crypto = __toESM(require("crypto"));
var AuthManager = class _AuthManager {
  constructor(context, outputChannel2) {
    this.context = context;
    this.outputChannel = outputChannel2;
  }
  static TOKEN_KEY = "google_token";
  static USER_INFO_KEY = "userInfo";
  /**
   * Khởi tạo quá trình đăng nhập Google bằng cách mở trình duyệt
   */
  async startLogin() {
    const session = crypto.randomUUID();
    const scopes = encodeURIComponent(
      "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid"
    );
    const loginUrl = `https://sheet-gen-auth.anonymus-indev.workers.dev/auth/login?session=${session}&scope=${scopes}&access_type=offline&prompt=consent`;
    const config = this.context.globalState.get("config") || {};
    const showOutput = config.showOutputChannel === true;
    this.outputChannel.appendLine(
      `[Auth] B\u1EAFt \u0111\u1EA7u \u0111\u0103ng nh\u1EADp th\xF4ng qua: ${loginUrl}`
    );
    if (showOutput) {
      this.outputChannel.show(true);
    }
    await vscode.env.openExternal(vscode.Uri.parse(loginUrl));
    vscode.window.showInformationMessage(
      "\u0110ang ch\u1EDD b\u1EA1n ho\xE0n t\u1EA5t \u0111\u0103ng nh\u1EADp tr\xEAn tr\xECnh duy\u1EC7t..."
    );
  }
  /**
   * Xử lý URI trả về từ trình duyệt sau khi đăng nhập thành công
   */
  async handleUri(uri) {
    this.outputChannel.appendLine(`[Auth] Nh\u1EADn URI: ${uri.toString()}`);
    const params = new URLSearchParams(uri.query);
    const token = params.get("token");
    if (token) {
      try {
        const tokenObj = JSON.parse(token);
        this.outputChannel.appendLine(
          `[Auth] C\xE1c tr\u01B0\u1EDDng trong token: ${Object.keys(tokenObj).join(", ")}`
        );
        await this.context.secrets.store(_AuthManager.TOKEN_KEY, token);
        await this.decodeAndStoreUserInfo(token);
        vscode.window.showInformationMessage("\u0110\u0103ng nh\u1EADp th\xE0nh c\xF4ng \u{1F389}");
        return true;
      } catch (err) {
        this.outputChannel.appendLine(`[Auth] L\u1ED7i x\u1EED l\xFD token: ${err}`);
      }
    }
    return false;
  }
  /**
   * Giải mã thông tin người dùng từ JWT id_token (nếu có)
   */
  async decodeAndStoreUserInfo(token) {
    try {
      let tokenObj = JSON.parse(token);
      if (tokenObj && tokenObj.id_token) {
        const payload = tokenObj.id_token.split(".")[1];
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const decoded = JSON.parse(
          Buffer.from(base64, "base64").toString("utf8")
        );
        const userInfo = {
          name: decoded.name,
          email: decoded.email,
          picture: decoded.picture
        };
        await this.context.globalState.update(
          _AuthManager.USER_INFO_KEY,
          userInfo
        );
        this.outputChannel.appendLine(
          `[Auth] Th\xF4ng tin ng\u01B0\u1EDDi d\xF9ng: ${userInfo.name} (${userInfo.email})`
        );
      }
    } catch (e) {
      this.outputChannel.appendLine(
        "[Auth] Token kh\xF4ng ph\u1EA3i \u0111\u1ECBnh d\u1EA1ng JSON ho\u1EB7c kh\xF4ng c\xF3 id_token \u0111\u1EC3 gi\u1EA3i m\xE3."
      );
    }
  }
  /**
   * Đăng xuất: Xóa token và thông tin người dùng
   */
  async logout() {
    await this.context.secrets.delete(_AuthManager.TOKEN_KEY);
    await this.context.globalState.update(_AuthManager.USER_INFO_KEY, void 0);
    this.outputChannel.appendLine("[Auth] \u0110\xE3 \u0111\u0103ng xu\u1EA5t.");
    vscode.window.showInformationMessage("\u0110\xE3 \u0111\u0103ng xu\u1EA5t.");
  }
  /**
   * Lấy thông tin trạng thái auth hiện tại
   */
  async getAuthData() {
    const googleToken = await this.context.secrets.get(_AuthManager.TOKEN_KEY);
    const userInfo = this.context.globalState.get(
      _AuthManager.USER_INFO_KEY
    );
    return {
      isLoggedIn: !!googleToken,
      user: userInfo
    };
  }
  /**
   * Làm mới Access Token sử dụng Refresh Token
   */
  async refreshToken() {
    this.outputChannel.appendLine(
      "[Auth] \u0110ang c\u1ED1 g\u1EAFng l\xE0m m\u1EDBi Access Token..."
    );
    const tokenStr = await this.context.secrets.get(_AuthManager.TOKEN_KEY);
    if (!tokenStr) return void 0;
    try {
      const tokenObj = JSON.parse(tokenStr);
      const refreshToken = tokenObj.refresh_token;
      if (!refreshToken) {
        this.outputChannel.appendLine("[Auth] Kh\xF4ng t\xECm th\u1EA5y Refresh Token.");
        return void 0;
      }
      const response = await fetch(
        `https://sheet-gen-auth.anonymus-indev.workers.dev/auth/refresh?refresh_token=${refreshToken}`
      );
      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.statusText}`);
      }
      const newTokenData = await response.json();
      if (newTokenData.access_token) {
        const updatedTokenObj = {
          ...tokenObj,
          access_token: newTokenData.access_token,
          expires_in: newTokenData.expires_in
        };
        await this.context.secrets.store(
          _AuthManager.TOKEN_KEY,
          JSON.stringify(updatedTokenObj)
        );
        this.outputChannel.appendLine(
          "[Auth] \u0110\xE3 l\xE0m m\u1EDBi Access Token th\xE0nh c\xF4ng."
        );
        return newTokenData.access_token;
      }
    } catch (err) {
      this.outputChannel.appendLine(`[Auth] L\u1ED7i khi refresh token: ${err}`);
    }
    return void 0;
  }
};

// src/sheet/index.ts
var SheetManager = class {
  constructor(outputChannel2) {
    this.outputChannel = outputChannel2;
  }
  /**
   * Thêm các bản ghi vào Google Sheet SRINPT
   */
  async addRecordsToSheet(spreadsheetId, accessToken, records) {
    const range = "SRINPT!A:C";
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW`;
    const values = records.map((r) => [r.no.toString(), r.fileName, r.time]);
    try {
      this.outputChannel.appendLine(
        `[Sheet] \u0110ang g\u1EEDi y\xEAu c\u1EA7u append t\u1EDBi Sheet ID: ${spreadsheetId}`
      );
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          values
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        this.outputChannel.appendLine(`[Sheet] L\u1ED7i API: ${errorText}`);
        throw new Error(`Google Sheets API error: ${response.statusText}`);
      }
      this.outputChannel.appendLine(
        `[Sheet] \u0110\xE3 th\xEAm ${records.length} b\u1EA3n ghi th\xE0nh c\xF4ng.`
      );
      return true;
    } catch (error) {
      this.outputChannel.appendLine(`[Sheet] L\u1ED7i khi th\xEAm b\u1EA3n ghi: ${error}`);
      throw error;
    }
  }
  /**
   * Đảm bảo sheet SRINPT tồn tại và có Header (nếu cần)
   * Lưu ý: Hiện tại đơn giản là append, nếu SRINPT chưa có thì API có thể báo lỗi 400
   */
  async ensureSheetExists(spreadsheetId, accessToken) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!response.ok) return false;
      const data = await response.json();
      const hasSheet = data.sheets?.some(
        (s) => s.properties?.title === "SRINPT"
      );
      if (!hasSheet) {
        this.outputChannel.appendLine(
          `[Sheet] Kh\xF4ng t\xECm th\u1EA5y sheet 'SRINPT'. \u0110ang t\u1EA1o m\u1EDBi...`
        );
        await this.createSheet(spreadsheetId, accessToken, "SRINPT");
        await this.addHeader(spreadsheetId, accessToken, "SRINPT");
      }
      return true;
    } catch (e) {
      return false;
    }
  }
  async createSheet(spreadsheetId, accessToken, title) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: { title }
            }
          }
        ]
      })
    });
  }
  async addHeader(spreadsheetId, accessToken, title) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${title}!A1:C1?valueInputOption=RAW`;
    await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        values: [["No.", "File name", "Time"]]
      })
    });
  }
  /**
   * Kiểm tra quyền truy cập vào Spreadsheet
   */
  async checkAccess(spreadsheetId, accessToken) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties(title)`;
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        const errorText = await response.text();
        this.outputChannel.appendLine(
          `[Sheet] CheckAccess th\u1EA5t b\u1EA1i. Status: ${response.status}`
        );
        this.outputChannel.appendLine(`[Sheet] Chi ti\u1EBFt l\u1ED7i: ${errorText}`);
        if (response.status === 403) {
          return {
            success: false,
            error: "Forbidden: API ch\u01B0a b\u1EADt ho\u1EB7c kh\xF4ng c\xF3 quy\u1EC1n ghi."
          };
        }
        return { success: false, error: "Kh\xF4ng t\xECm th\u1EA5y Sheet ho\u1EB7c ID sai." };
      }
      const data = await response.json();
      return { success: true, title: data.properties?.title || "Untitled" };
    } catch (e) {
      return { success: false, error: "L\u1ED7i k\u1EBFt n\u1ED1i khi ki\u1EC3m tra quy\u1EC1n." };
    }
  }
};

// src/extension.ts
var activeWebviews = /* @__PURE__ */ new Set();
var outputChannel = vscode2.window.createOutputChannel("Doc Generator");
var authManager;
function activate(context) {
  outputChannel.appendLine("Doc Generator extension is now active");
  authManager = new AuthManager(context, outputChannel);
  const provider = new DocGenWebviewViewProvider(
    context.extensionUri,
    context,
    authManager
  );
  context.subscriptions.push(
    vscode2.window.registerWebviewViewProvider("docGenView", provider)
  );
  context.subscriptions.push(
    vscode2.window.registerUriHandler({
      handleUri: async (uri) => {
        if (await authManager.handleUri(uri)) {
          await broadcastConfig(context);
        }
      }
    })
  );
  context.subscriptions.push(
    vscode2.commands.registerCommand("doc-gen.openTool", (tool) => {
      const route = tool === "sheet" ? "/sheet-gen" : "/docs-gen";
      const title = tool === "sheet" ? "Sheet Generator" : "Doc Generator";
      const panel = vscode2.window.createWebviewPanel(
        "docGenPool",
        title,
        vscode2.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );
      panel.webview.html = getWebviewHtml(panel.webview, context, route);
      activeWebviews.add(panel.webview);
      panel.onDidDispose(() => activeWebviews.delete(panel.webview));
      panel.webview.onDidReceiveMessage(async (data) => {
        const fullConfig = await getFullConfig(context);
        const accessToken = fullConfig.accessToken;
        switch (data.command) {
          case "generateSheet":
            outputChannel.show(true);
            if (!accessToken) {
              vscode2.window.showErrorMessage("B\u1EA1n ch\u01B0a \u0111\u0103ng nh\u1EADp Google.");
              panel.webview.postMessage({
                command: "generateResult",
                success: false
              });
              return;
            }
            const runGenerate = async (token) => {
              outputChannel.appendLine(
                `[Sheet] --- B\u1EAFt \u0111\u1EA7u qu\xE1 tr\xECnh Generate ---`
              );
              const sheetManager = new SheetManager(outputChannel);
              await sheetManager.ensureSheetExists(data.sheetId, token);
              const records = data.files.map((f, idx) => ({
                no: idx + 1,
                fileName: f.fileName,
                time: (/* @__PURE__ */ new Date()).toLocaleString("vi-VN")
              }));
              await sheetManager.addRecordsToSheet(
                data.sheetId,
                token,
                records
              );
              vscode2.window.showInformationMessage(
                "\u0110\xE3 th\xEAm d\u1EEF li\u1EC7u th\xE0nh c\xF4ng!"
              );
              panel.webview.postMessage({
                command: "generateResult",
                success: true
              });
            };
            try {
              await runGenerate(accessToken);
            } catch (err) {
              if (err.message?.includes("401") || err.message?.includes("Unauthorized")) {
                const refreshedToken = await authManager.refreshToken();
                if (refreshedToken) {
                  try {
                    await runGenerate(refreshedToken);
                    return;
                  } catch (secondErr) {
                    err = secondErr;
                  }
                }
              }
              vscode2.window.showErrorMessage(`L\u1ED7i: ${err.message}`);
              panel.webview.postMessage({
                command: "generateResult",
                success: false
              });
            }
            break;
          case "checkSheetAccess":
            outputChannel.appendLine(
              `[Sheet] \u0110ang ki\u1EC3m tra quy\u1EC1n: ${data.sheetId}`
            );
            if (!accessToken) {
              panel.webview.postMessage({
                command: "checkSheetAccessResult",
                success: false,
                error: "Ch\u01B0a \u0111\u0103ng nh\u1EADp"
              });
              return;
            }
            const runCheck = async (token) => {
              const sm = new SheetManager(outputChannel);
              const result = await sm.checkAccess(data.sheetId, token);
              if (!result.success && result.error?.includes("401")) {
                throw new Error("401-Unauthorized");
              }
              panel.webview.postMessage({
                command: "checkSheetAccessResult",
                ...result
              });
            };
            try {
              await runCheck(accessToken);
            } catch (err) {
              if (err.message?.includes("401")) {
                const refreshedToken = await authManager.refreshToken();
                if (refreshedToken) {
                  try {
                    await runCheck(refreshedToken);
                    return;
                  } catch (e) {
                  }
                }
              }
              panel.webview.postMessage({
                command: "checkSheetAccessResult",
                success: false,
                error: "L\u1ED7i k\u1EBFt n\u1ED1i"
              });
            }
            break;
          case "getConfig":
            await broadcastConfig(context, panel.webview);
            break;
          case "saveConfig":
            if (data.data) {
              if (data.data.geminiApiKey !== void 0) {
                if (data.data.geminiApiKey === "") {
                  await context.secrets.delete("geminiApiKey");
                } else {
                  await context.secrets.store(
                    "geminiApiKey",
                    data.data.geminiApiKey
                  );
                }
                delete data.data.geminiApiKey;
              }
              await context.globalState.update("config", data.data);
              await broadcastConfig(context);
              vscode2.window.showInformationMessage(
                "\u0110\xE3 l\u01B0u c\u1EA5u h\xECnh th\xE0nh c\xF4ng."
              );
            }
            break;
          case "readFilesContent":
            const results = [];
            const processUri = async (uri) => {
              const stat = await vscode2.workspace.fs.stat(uri);
              const name = uri.path.split("/").pop() || "";
              if (stat.type === vscode2.FileType.Directory) {
                const folderFiles = [];
                const scanDirectory = async (dirUri) => {
                  const entries = await vscode2.workspace.fs.readDirectory(dirUri);
                  for (const [entryName, entryType] of entries) {
                    const entryUri = vscode2.Uri.joinPath(dirUri, entryName);
                    if (entryType === vscode2.FileType.Directory) {
                      await scanDirectory(entryUri);
                    } else if (entryType === vscode2.FileType.File) {
                      const content = await vscode2.workspace.fs.readFile(entryUri);
                      folderFiles.push({
                        fileName: entryName,
                        content: new TextDecoder().decode(content)
                      });
                    }
                  }
                };
                await scanDirectory(uri);
                results.push({
                  uri: uri.toString(),
                  fileName: name,
                  isDirectory: true,
                  fileCount: folderFiles.length,
                  files: folderFiles
                  // Chứa danh sách các file con để preview
                });
              } else {
                const content = await vscode2.workspace.fs.readFile(uri);
                results.push({
                  uri: uri.toString(),
                  fileName: name,
                  isDirectory: false,
                  content: new TextDecoder().decode(content)
                });
              }
            };
            for (const uriStr of data.files) {
              try {
                await processUri(vscode2.Uri.parse(uriStr));
              } catch (err) {
                results.push({
                  uri: uriStr,
                  fileName: uriStr.split("/").pop(),
                  isDirectory: false,
                  content: "L\u1ED7i: Kh\xF4ng th\u1EC3 \u0111\u1ECDc m\u1EE5c n\xE0y."
                });
              }
            }
            panel.webview.postMessage({
              command: "fileContentsResult",
              contents: results
            });
            break;
          case "login":
          case "login-google":
            await authManager.startLogin();
            break;
          case "logout":
            await authManager.logout();
            await broadcastConfig(context);
            break;
        }
      });
    })
  );
  context.subscriptions.push(
    vscode2.commands.registerCommand("doc-gen.toggleOutput", async () => {
      const config = context.globalState.get("config") || {};
      const newValue = !config.showOutputChannel;
      config.showOutputChannel = newValue;
      await context.globalState.update("config", config);
      await broadcastConfig(context);
      vscode2.window.showInformationMessage(
        `Output Channel hi\u1EC7n \u0111ang: ${newValue ? "HI\u1EC2N TH\u1ECA" : "\u1EA8N"}`
      );
    })
  );
  context.subscriptions.push(
    vscode2.commands.registerCommand("doc-gen.sheetGenerator", () => {
      vscode2.commands.executeCommand("doc-gen.openTool", "sheet");
    })
  );
}
var DocGenWebviewViewProvider = class {
  constructor(_extensionUri, _context, _authManager) {
    this._extensionUri = _extensionUri;
    this._context = _context;
    this._authManager = _authManager;
  }
  resolveWebviewView(webviewView, _context, _token) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    webviewView.webview.html = getWebviewHtml(
      webviewView.webview,
      this._context,
      "/main-sidebar"
    );
    activeWebviews.add(webviewView.webview);
    webviewView.onDidDispose(() => activeWebviews.delete(webviewView.webview));
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.command) {
        case "getConfig":
          await broadcastConfig(this._context, webviewView.webview);
          break;
        case "saveConfig":
          if (data.data) {
            if (data.data.geminiApiKey !== void 0) {
              if (data.data.geminiApiKey === "") {
                await this._context.secrets.delete("geminiApiKey");
              } else {
                await this._context.secrets.store(
                  "geminiApiKey",
                  data.data.geminiApiKey
                );
              }
              delete data.data.geminiApiKey;
            }
            await this._context.globalState.update("config", data.data);
            await broadcastConfig(this._context);
            vscode2.window.showInformationMessage("\u0110\xE3 l\u01B0u c\u1EA5u h\xECnh th\xE0nh c\xF4ng.");
          }
          break;
        case "login":
        case "login-google":
          await this._authManager.startLogin();
          break;
        case "navigate":
          if (data.path === "/sheet-gen") {
            vscode2.commands.executeCommand("doc-gen.openTool", "sheet");
          } else if (data.path === "/docs-gen") {
            vscode2.commands.executeCommand("doc-gen.openTool", "doc");
          }
          break;
        case "logout":
          await this._authManager.logout();
          await broadcastConfig(this._context);
          break;
      }
    });
  }
};
async function getFullConfig(context) {
  const config = context.globalState.get("config") || {};
  const geminiApiKey = await context.secrets.get("geminiApiKey") || "";
  const authData = await authManager.getAuthData();
  const googleTokenStr = await context.secrets.get("google_token");
  let accessToken = "";
  if (googleTokenStr) {
    try {
      const tokenObj = JSON.parse(googleTokenStr);
      accessToken = tokenObj.access_token || "";
    } catch (e) {
    }
  }
  return {
    showOutputChannel: false,
    ...config,
    geminiApiKey,
    ...authData,
    accessToken
  };
}
async function broadcastConfig(context, target) {
  const fullConfig = await getFullConfig(context);
  const message = {
    command: "loadConfig",
    data: fullConfig
  };
  if (target) {
    target.postMessage(message);
  } else {
    activeWebviews.forEach((wv) => wv.postMessage(message));
  }
}
function getWebviewHtml(webview, context, initialRoute = "/sheet-generator") {
  const distPath = vscode2.Uri.joinPath(
    context.extensionUri,
    "webview-ui",
    "dist"
  );
  const indexPath = vscode2.Uri.joinPath(distPath, "index.html");
  if (!fs.existsSync(indexPath.fsPath)) {
    return `<!DOCTYPE html><html><body><h1>Webview content not found</h1><p>Please build the webview-ui project.</p></body></html>`;
  }
  let html = fs.readFileSync(indexPath.fsPath, "utf8");
  html = html.replace(
    "<head>",
    `<head>
      <script>
        window.initialRoute = "${initialRoute}";
      </script>`
  );
  html = html.replace(/(src|href)="(.+?)"/g, (match, type, path) => {
    if (path.startsWith("http")) {
      return match;
    }
    const assetUri = webview.asWebviewUri(vscode2.Uri.joinPath(distPath, path));
    return `${type}="${assetUri}"`;
  });
  return html;
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
