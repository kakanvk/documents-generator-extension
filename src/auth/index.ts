import * as vscode from "vscode";
import * as crypto from "crypto";

export class AuthManager {
  private static readonly TOKEN_KEY = "google_token";
  private static readonly USER_INFO_KEY = "userInfo";

  constructor(
    private context: vscode.ExtensionContext,
    private outputChannel: vscode.OutputChannel,
  ) {}

  /**
   * Khởi tạo quá trình đăng nhập Google bằng cách mở trình duyệt
   */
  public async startLogin() {
    const session = crypto.randomUUID();
    const scopes = encodeURIComponent(
      "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid",
    );
    // Worker giúp điều hướng về vscode://kakanvk.doc-gen/auth?token=...
    const loginUrl = `https://sheet-gen-auth.anonymus-indev.workers.dev/auth/login?session=${session}&scope=${scopes}&access_type=offline&prompt=consent`;

    const config = this.context.globalState.get<any>("config") || {};
    const showOutput = config.showOutputChannel === true;

    this.outputChannel.appendLine(
      `[Auth] Bắt đầu đăng nhập thông qua: ${loginUrl}`,
    );
    if (showOutput) {
      this.outputChannel.show(true);
    }

    // Mở trình duyệt ngoài
    await vscode.env.openExternal(vscode.Uri.parse(loginUrl));
    vscode.window.showInformationMessage(
      "Đang chờ bạn hoàn tất đăng nhập trên trình duyệt...",
    );
  }

  /**
   * Xử lý URI trả về từ trình duyệt sau khi đăng nhập thành công
   */
  public async handleUri(uri: vscode.Uri): Promise<boolean> {
    this.outputChannel.appendLine(`[Auth] Nhận URI: ${uri.toString()}`);
    const params = new URLSearchParams(uri.query);
    const token = params.get("token");

    if (token) {
      try {
        const tokenObj = JSON.parse(token);
        this.outputChannel.appendLine(
          `[Auth] Các trường trong token: ${Object.keys(tokenObj).join(", ")}`,
        );

        await this.context.secrets.store(AuthManager.TOKEN_KEY, token);
        await this.decodeAndStoreUserInfo(token);
        vscode.window.showInformationMessage("Đăng nhập thành công 🎉");
        return true;
      } catch (err) {
        this.outputChannel.appendLine(`[Auth] Lỗi xử lý token: ${err}`);
      }
    }
    return false;
  }

  /**
   * Giải mã thông tin người dùng từ JWT id_token (nếu có)
   */
  private async decodeAndStoreUserInfo(token: string) {
    try {
      let tokenObj = JSON.parse(token);
      if (tokenObj && tokenObj.id_token) {
        const payload = tokenObj.id_token.split(".")[1];
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const decoded = JSON.parse(
          Buffer.from(base64, "base64").toString("utf8"),
        );
        const userInfo = {
          name: decoded.name,
          email: decoded.email,
          picture: decoded.picture,
        };
        await this.context.globalState.update(
          AuthManager.USER_INFO_KEY,
          userInfo,
        );
        this.outputChannel.appendLine(
          `[Auth] Thông tin người dùng: ${userInfo.name} (${userInfo.email})`,
        );
      }
    } catch (e) {
      this.outputChannel.appendLine(
        "[Auth] Token không phải định dạng JSON hoặc không có id_token để giải mã.",
      );
    }
  }

  /**
   * Đăng xuất: Xóa token và thông tin người dùng
   */
  public async logout() {
    await this.context.secrets.delete(AuthManager.TOKEN_KEY);
    await this.context.globalState.update(AuthManager.USER_INFO_KEY, undefined);
    this.outputChannel.appendLine("[Auth] Đã đăng xuất.");
    vscode.window.showInformationMessage("Đã đăng xuất.");
  }

  /**
   * Lấy thông tin trạng thái auth hiện tại
   */
  public async getAuthData() {
    const googleToken = await this.context.secrets.get(AuthManager.TOKEN_KEY);
    const userInfo = this.context.globalState.get<any>(
      AuthManager.USER_INFO_KEY,
    );
    return {
      isLoggedIn: !!googleToken,
      user: userInfo,
    };
  }

  /**
   * Làm mới Access Token sử dụng Refresh Token
   */
  public async refreshToken(): Promise<string | undefined> {
    this.outputChannel.appendLine(
      "[Auth] Đang cố gắng làm mới Access Token...",
    );
    const tokenStr = await this.context.secrets.get(AuthManager.TOKEN_KEY);
    if (!tokenStr) return undefined;

    try {
      const tokenObj = JSON.parse(tokenStr);
      const refreshToken = tokenObj.refresh_token;

      if (!refreshToken) {
        this.outputChannel.appendLine("[Auth] Không tìm thấy Refresh Token.");
        return undefined;
      }

      // Gọi worker để thực hiện refresh
      const response = await fetch(
        `https://sheet-gen-auth.anonymus-indev.workers.dev/auth/refresh?refresh_token=${refreshToken}`,
      );

      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.statusText}`);
      }

      const newTokenData: any = await response.json();
      if (newTokenData.access_token) {
        // Cập nhật lại access_token mới vào object cũ (giữ lại refresh_token)
        const updatedTokenObj = {
          ...tokenObj,
          access_token: newTokenData.access_token,
          expires_in: newTokenData.expires_in,
        };

        await this.context.secrets.store(
          AuthManager.TOKEN_KEY,
          JSON.stringify(updatedTokenObj),
        );
        this.outputChannel.appendLine(
          "[Auth] Đã làm mới Access Token thành công.",
        );
        return newTokenData.access_token;
      }
    } catch (err) {
      this.outputChannel.appendLine(`[Auth] Lỗi khi refresh token: ${err}`);
    }
    return undefined;
  }
}
