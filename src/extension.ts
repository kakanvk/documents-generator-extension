import * as vscode from "vscode";
import * as fs from "fs";

export function activate(context: vscode.ExtensionContext) {
  console.log("doc-gen is active");

  // 1. Register Webview View Provider for the Sidebar
  const provider = new DocGenWebviewViewProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("docGenView", provider),
  );

  // 2. Register Command to open Webview in a Panel (Tab)
  context.subscriptions.push(
    vscode.commands.registerCommand("doc-gen.sheetGenerator", () => {
      const panel = vscode.window.createWebviewPanel(
        "docGen",
        "Doc Gen",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        },
      );
      panel.webview.html = getWebviewHtml(
        panel.webview,
        context,
        "/sheet-generator",
      );
    }),
  );
}

class DocGenWebviewViewProvider implements vscode.WebviewViewProvider {
  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
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

    // Use React App for Sidebar with /main-sidebar route
    webviewView.webview.html = getWebviewHtml(
      webviewView.webview,
      this._context,
      "/main-sidebar",
    );

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.command) {
        case "login":
          vscode.commands.executeCommand("doc-gen.sheetGenerator");
          break;
      }
    });
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
    `<head><script>window.initialRoute = "${initialRoute}";</script>`,
  );

  // Convert local paths to webview paths
  html = html.replace(/(src|href)="(.+?)"/g, (match, type, path) => {
    if (path.startsWith("http")) return match;
    const assetUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, path));
    return `${type}="${assetUri}"`;
  });

  return html;
}

export function deactivate() {}
