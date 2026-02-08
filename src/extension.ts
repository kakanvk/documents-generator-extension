import * as vscode from "vscode";
import * as fs from "fs";
import { AuthManager } from "./auth";
import { SheetManager } from "./sheet";

// Danh sách các webview đang hoạt động để đồng bộ cấu hình
const activeWebviews = new Set<vscode.Webview>();
const outputChannel = vscode.window.createOutputChannel("Doc Generator");
let authManager: AuthManager;

export function activate(context: vscode.ExtensionContext) {
  outputChannel.appendLine("Doc Generator extension is now active");

  // Khởi tạo AuthManager
  authManager = new AuthManager(context, outputChannel);

  // 1. Register Webview View Provider for the Sidebar
  const provider = new DocGenWebviewViewProvider(
    context.extensionUri,
    context,
    authManager,
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("docGenView", provider),
  );

  // 1.1 Registered UriHandler to receive token from browser redirect
  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri: async (uri: vscode.Uri) => {
        if (await authManager.handleUri(uri)) {
          await broadcastConfig(context);
        }
      },
    }),
  );

  // 2. Register Command to open Webview in a Panel (Tab)
  context.subscriptions.push(
    vscode.commands.registerCommand("doc-gen.openTool", (tool: string) => {
      const route = tool === "sheet" ? "/sheet-gen" : "/docs-gen";
      const title = tool === "sheet" ? "Sheet Generator" : "Doc Generator";

      const panel = vscode.window.createWebviewPanel(
        "docGenPool",
        title,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        },
      );
      panel.webview.html = getWebviewHtml(panel.webview, context, route);

      activeWebviews.add(panel.webview);
      panel.onDidDispose(() => activeWebviews.delete(panel.webview));

      // Nhận message từ Panel
      panel.webview.onDidReceiveMessage(async (data) => {
        const fullConfig = await getFullConfig(context);
        const accessToken = fullConfig.accessToken;

        switch (data.command) {
          case "generateSheet":
            outputChannel.show(true);
            if (!accessToken) {
              vscode.window.showErrorMessage("Bạn chưa đăng nhập Google.");
              panel.webview.postMessage({
                command: "generateResult",
                success: false,
              });
              return;
            }

            const runGenerate = async (token: string) => {
              outputChannel.appendLine(
                `[Sheet] --- Bắt đầu quá trình Generate ---`,
              );
              const sheetManager = new SheetManager(outputChannel);
              await sheetManager.ensureSheetExists(data.sheetId, token);
              const records = data.files.map((f: any, idx: number) => ({
                no: idx + 1,
                fileName: f.fileName,
                time: new Date().toLocaleString("vi-VN"),
              }));
              await sheetManager.addRecordsToSheet(
                data.sheetId,
                token,
                records,
              );
              vscode.window.showInformationMessage(
                "Đã thêm dữ liệu thành công!",
              );
              panel.webview.postMessage({
                command: "generateResult",
                success: true,
              });
            };

            try {
              await runGenerate(accessToken);
            } catch (err: any) {
              if (
                err.message?.includes("401") ||
                err.message?.includes("Unauthorized")
              ) {
                const refreshedToken = await authManager.refreshToken();
                if (refreshedToken) {
                  try {
                    await runGenerate(refreshedToken);
                    return;
                  } catch (secondErr: any) {
                    err = secondErr;
                  }
                }
              }
              vscode.window.showErrorMessage(`Lỗi: ${err.message}`);
              panel.webview.postMessage({
                command: "generateResult",
                success: false,
              });
            }
            break;

          case "checkSheetAccess":
            outputChannel.appendLine(
              `[Sheet] Đang kiểm tra quyền: ${data.sheetId}`,
            );
            if (!accessToken) {
              panel.webview.postMessage({
                command: "checkSheetAccessResult",
                success: false,
                error: "Chưa đăng nhập",
              });
              return;
            }

            const runCheck = async (token: string) => {
              const sm = new SheetManager(outputChannel);
              const result = await sm.checkAccess(data.sheetId, token);
              // Nếu checkAccess trả về success=false nhưng status=401, ta throw để catch và refresh
              if (!result.success && result.error?.includes("401")) {
                throw new Error("401-Unauthorized");
              }
              panel.webview.postMessage({
                command: "checkSheetAccessResult",
                ...result,
              });
            };

            try {
              await runCheck(accessToken);
            } catch (err: any) {
              if (err.message?.includes("401")) {
                const refreshedToken = await authManager.refreshToken();
                if (refreshedToken) {
                  try {
                    await runCheck(refreshedToken);
                    return;
                  } catch (e) {}
                }
              }
              panel.webview.postMessage({
                command: "checkSheetAccessResult",
                success: false,
                error: "Lỗi kết nối",
              });
            }
            break;
          case "getConfig":
            // ... (existing cases)
            await broadcastConfig(context, panel.webview);
            break;
          case "saveConfig":
            if (data.data) {
              if (data.data.geminiApiKey !== undefined) {
                if (data.data.geminiApiKey === "") {
                  await context.secrets.delete("geminiApiKey");
                } else {
                  await context.secrets.store(
                    "geminiApiKey",
                    data.data.geminiApiKey,
                  );
                }
                delete data.data.geminiApiKey;
              }
              await context.globalState.update("config", data.data);
              await broadcastConfig(context);
              vscode.window.showInformationMessage(
                "Đã lưu cấu hình thành công.",
              );
            }
            break;
          case "readFilesContent":
            const results: any[] = [];

            const processUri = async (uri: vscode.Uri) => {
              const stat = await vscode.workspace.fs.stat(uri);
              const name = uri.path.split("/").pop() || "";

              if (stat.type === vscode.FileType.Directory) {
                const folderFiles: { fileName: string; content: string }[] = [];

                const scanDirectory = async (dirUri: vscode.Uri) => {
                  const entries =
                    await vscode.workspace.fs.readDirectory(dirUri);
                  for (const [entryName, entryType] of entries) {
                    const entryUri = vscode.Uri.joinPath(dirUri, entryName);
                    if (entryType === vscode.FileType.Directory) {
                      await scanDirectory(entryUri);
                    } else if (entryType === vscode.FileType.File) {
                      const content =
                        await vscode.workspace.fs.readFile(entryUri);
                      folderFiles.push({
                        fileName: entryName,
                        content: new TextDecoder().decode(content),
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
                  files: folderFiles, // Chứa danh sách các file con để preview
                });
              } else {
                const content = await vscode.workspace.fs.readFile(uri);
                results.push({
                  uri: uri.toString(),
                  fileName: name,
                  isDirectory: false,
                  content: new TextDecoder().decode(content),
                });
              }
            };

            for (const uriStr of data.files) {
              try {
                await processUri(vscode.Uri.parse(uriStr));
              } catch (err) {
                results.push({
                  uri: uriStr,
                  fileName: uriStr.split("/").pop(),
                  isDirectory: false,
                  content: "Lỗi: Không thể đọc mục này.",
                });
              }
            }
            panel.webview.postMessage({
              command: "fileContentsResult",
              contents: results,
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
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("doc-gen.toggleOutput", async () => {
      const config = context.globalState.get<any>("config") || {};
      const newValue = !config.showOutputChannel;
      config.showOutputChannel = newValue;
      await context.globalState.update("config", config);
      await broadcastConfig(context);
      vscode.window.showInformationMessage(
        `Output Channel hiện đang: ${newValue ? "HIỂN THỊ" : "ẨN"}`,
      );
    }),
  );

  // Giữ lại command cũ để không lỗi nếu được gọi từ đâu đó, nhưng trỏ về openTool
  context.subscriptions.push(
    vscode.commands.registerCommand("doc-gen.sheetGenerator", () => {
      vscode.commands.executeCommand("doc-gen.openTool", "sheet");
    }),
  );
}

class DocGenWebviewViewProvider implements vscode.WebviewViewProvider {
  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
    private readonly _authManager: AuthManager,
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = getWebviewHtml(
      webviewView.webview,
      this._context,
      "/main-sidebar",
    );

    activeWebviews.add(webviewView.webview);
    webviewView.onDidDispose(() => activeWebviews.delete(webviewView.webview));

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.command) {
        case "getConfig":
          await broadcastConfig(this._context, webviewView.webview);
          break;
        case "saveConfig":
          if (data.data) {
            if (data.data.geminiApiKey !== undefined) {
              if (data.data.geminiApiKey === "") {
                await this._context.secrets.delete("geminiApiKey");
              } else {
                await this._context.secrets.store(
                  "geminiApiKey",
                  data.data.geminiApiKey,
                );
              }
              delete data.data.geminiApiKey;
            }
            await this._context.globalState.update("config", data.data);
            await broadcastConfig(this._context);
            vscode.window.showInformationMessage("Đã lưu cấu hình thành công.");
          }
          break;
        case "login":
        case "login-google":
          await this._authManager.startLogin();
          break;
        case "navigate":
          if (data.path === "/sheet-gen") {
            vscode.commands.executeCommand("doc-gen.openTool", "sheet");
          } else if (data.path === "/docs-gen") {
            vscode.commands.executeCommand("doc-gen.openTool", "doc");
          }
          break;
        case "logout":
          await this._authManager.logout();
          await broadcastConfig(this._context);
          break;
      }
    });
  }
}

async function getFullConfig(context: vscode.ExtensionContext) {
  const config = context.globalState.get<any>("config") || {};
  const geminiApiKey = (await context.secrets.get("geminiApiKey")) || "";
  const authData = await authManager.getAuthData();

  // Lấy access token từ secret
  const googleTokenStr = await context.secrets.get("google_token");
  let accessToken = "";
  if (googleTokenStr) {
    try {
      const tokenObj = JSON.parse(googleTokenStr);
      accessToken = tokenObj.access_token || "";
    } catch (e) {}
  }

  return {
    showOutputChannel: false,
    ...config,
    geminiApiKey,
    ...authData,
    accessToken,
  };
}

async function broadcastConfig(
  context: vscode.ExtensionContext,
  target?: vscode.Webview,
) {
  const fullConfig = await getFullConfig(context);

  const message = {
    command: "loadConfig",
    data: fullConfig,
  };

  if (target) {
    target.postMessage(message);
  } else {
    activeWebviews.forEach((wv) => wv.postMessage(message));
  }
}

function getWebviewHtml(
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
  initialRoute: string = "/sheet-generator",
) {
  const distPath = vscode.Uri.joinPath(
    context.extensionUri,
    "webview-ui",
    "dist",
  );
  const indexPath = vscode.Uri.joinPath(distPath, "index.html");

  if (!fs.existsSync(indexPath.fsPath)) {
    return `<!DOCTYPE html><html><body><h1>Webview content not found</h1><p>Please build the webview-ui project.</p></body></html>`;
  }

  let html = fs.readFileSync(indexPath.fsPath, "utf8");

  // Inject initial route for React to handle
  html = html.replace(
    "<head>",
    `<head>
      <script>
        window.initialRoute = "${initialRoute}";
      </script>`,
  );

  // Convert local paths to webview paths
  html = html.replace(/(src|href)="(.+?)"/g, (match, type, path) => {
    if (path.startsWith("http")) {
      return match;
    }
    const assetUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, path));
    return `${type}="${assetUri}"`;
  });

  return html;
}

export function deactivate() {}
