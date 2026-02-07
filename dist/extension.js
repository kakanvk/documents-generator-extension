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
var vscode = __toESM(require("vscode"));
var fs = __toESM(require("fs"));
function activate(context) {
  console.log("doc-gen is active");
  const provider = new DocGenWebviewViewProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("docGenView", provider)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("doc-gen.sheetGenerator", () => {
      const panel = vscode.window.createWebviewPanel(
        "docGen",
        "Doc Gen",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );
      panel.webview.html = getWebviewHtml(
        panel.webview,
        context,
        "/sheet-generator"
      );
    })
  );
}
var DocGenWebviewViewProvider = class {
  constructor(_extensionUri, _context) {
    this._extensionUri = _extensionUri;
    this._context = _context;
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
    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.command) {
        case "login":
          vscode.commands.executeCommand("doc-gen.sheetGenerator");
          break;
      }
    });
  }
};
function getWebviewHtml(webview, context, initialRoute = "/sheet-generator") {
  const distPath = vscode.Uri.joinPath(
    context.extensionUri,
    "webview-ui",
    "dist"
  );
  const indexPath = vscode.Uri.joinPath(distPath, "index.html");
  if (!fs.existsSync(indexPath.fsPath)) {
    return `<!DOCTYPE html><html><body><h1>Webview content not found</h1><p>Please build the webview-ui project.</p></body></html>`;
  }
  let html = fs.readFileSync(indexPath.fsPath, "utf8");
  html = html.replace(
    "<head>",
    `<head><script>window.initialRoute = "${initialRoute}";</script>`
  );
  html = html.replace(/(src|href)="(.+?)"/g, (match, type, path) => {
    if (path.startsWith("http")) return match;
    const assetUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, path));
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
