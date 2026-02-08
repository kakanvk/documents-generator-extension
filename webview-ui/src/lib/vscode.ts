/**
 * Tiện ích để quản lý VS Code API duy nhất cho toàn bộ webview.
 * acquireVsCodeApi() chỉ có thể được gọi một lần.
 */
declare function acquireVsCodeApi(): {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
};

class VSCodeAPI {
  private static instance: any;

  static getInstance() {
    if (!this.instance) {
      if (typeof acquireVsCodeApi === "function") {
        this.instance = acquireVsCodeApi();
      } else {
        // Mock cho môi trường browser nếu cần dùng npm run dev
        this.instance = {
          postMessage: (msg: any) => console.log("VS Code Message:", msg),
          getState: () => ({}),
          setState: (state: any) => console.log("Set state:", state),
        };
      }
    }
    return this.instance;
  }
}

export const vscode = VSCodeAPI.getInstance();
