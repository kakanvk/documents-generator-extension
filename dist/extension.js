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
      const responseText = await response.text();
      this.outputChannel.appendLine(`[Auth] Refresh Response: ${responseText}`);
      let newTokenData;
      try {
        newTokenData = JSON.parse(responseText);
      } catch (jsonErr) {
        throw new Error(
          `Invalid JSON response: ${responseText.substring(0, 100)}...`
        );
      }
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
        if (response.status === 401) {
          throw new Error("401-Unauthorized");
        }
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
   */
  async ensureSheetExists(spreadsheetId, accessToken) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("401-Unauthorized");
      }
      return false;
    }
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
    const range = `${title}!A1:C1`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
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
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
      const errorText = await response.text();
      this.outputChannel.appendLine(
        `[Sheet] CheckAccess th\u1EA5t b\u1EA1i. Status: ${response.status}`
      );
      this.outputChannel.appendLine(`[Sheet] Chi ti\u1EBFt l\u1ED7i: ${errorText}`);
      if (response.status === 401) {
        throw new Error("401-Unauthorized");
      }
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
  }
  /**
   * Lấy dữ liệu từ sheet (ID, EPIC, USER STORY)
   */
  async getSheetData(spreadsheetId, accessToken, sheetName) {
    try {
      let range = sheetName ? `${sheetName}!B:F` : "B:F";
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
      this.outputChannel.appendLine(
        `[Sheet] \u0110ang \u0111\u1ECDc d\u1EEF li\u1EC7u t\u1EEB Sheet ID: ${spreadsheetId}, Range: ${range}`
      );
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        const errorText = await response.text();
        this.outputChannel.appendLine(`[Sheet] L\u1ED7i API: ${errorText}`);
        if (response.status === 401) {
          throw new Error("401-Unauthorized");
        }
        throw new Error(`Google Sheets API error: ${response.statusText}`);
      }
      const data = await response.json();
      const values = data.values || [];
      const tasks = [];
      let currentTask = null;
      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        if (!row || row.length === 0) continue;
        const id = row[0]?.toString().trim();
        const epic = row[1]?.toString().trim();
        const userStory = row[2]?.toString().trim();
        const startDate = row[3]?.toString().trim() || "";
        const endDate = row[4]?.toString().trim() || "";
        if (id) {
          currentTask = {
            id,
            epic: epic || "",
            userStories: []
          };
          tasks.push(currentTask);
        }
        if (currentTask && userStory) {
          currentTask.userStories.push({
            content: userStory,
            startDate,
            endDate
          });
        }
      }
      this.outputChannel.appendLine(
        `[Sheet] \u0110\xE3 \u0111\u1ECDc ${tasks.length} task ch\xEDnh t\u1EEB sheet`
      );
      return tasks;
    } catch (error) {
      this.outputChannel.appendLine(`[Sheet] L\u1ED7i khi \u0111\u1ECDc d\u1EEF li\u1EC7u: ${error}`);
      throw error;
    }
  }
  /**
   * Tạo sheet chi tiết dựa trên template và dữ liệu từ Gemini
   */
  async createDetailedSheet(spreadsheetId, accessToken, task, geminiData) {
    const sheetName = `${task.id}.Details`;
    try {
      this.outputChannel.appendLine(
        `[Sheet] B\u1EAFt \u0111\u1EA7u t\u1EA1o sheet chi ti\u1EBFt: ${sheetName}`
      );
      const spreadsheet = await this.getSpreadsheet(
        spreadsheetId,
        accessToken
      );
      const sheets = spreadsheet.sheets || [];
      const templateSheet = sheets.find(
        (s) => s.properties?.title === "Template"
      );
      const existingSheet = sheets.find(
        (s) => s.properties?.title === sheetName
      );
      if (!templateSheet) {
        throw new Error("Kh\xF4ng t\xECm th\u1EA5y sheet 'Template' \u0111\u1EC3 l\xE0m m\u1EABu.");
      }
      const templateSheetId = templateSheet.properties.sheetId;
      const requests = [];
      if (existingSheet) {
        requests.push({
          deleteSheet: { sheetId: existingSheet.properties.sheetId }
        });
      }
      requests.push({
        duplicateSheet: {
          sourceSheetId: templateSheetId,
          newSheetName: sheetName,
          insertSheetIndex: sheets.length
        }
      });
      const batchResponse = await this.batchUpdate(
        spreadsheetId,
        accessToken,
        requests
      );
      const newSheetId = batchResponse.replies.find(
        (r) => r.duplicateSheet
      ).duplicateSheet.properties.sheetId;
      const rows = [];
      const mergeRequests = [];
      let currentRowIndex = 2;
      for (const [category, subtasks] of Object.entries(geminiData)) {
        const catRowIndex = currentRowIndex;
        const catRow = new Array(12).fill("");
        catRow[3] = category;
        catRow[6] = "PASSED";
        catRow[8] = "LOW";
        catRow[9] = "SIMPLE";
        rows.push(catRow);
        currentRowIndex++;
        mergeRequests.push({
          mergeCells: {
            range: {
              sheetId: newSheetId,
              startRowIndex: catRowIndex,
              endRowIndex: catRowIndex + 1,
              startColumnIndex: 1,
              // B
              endColumnIndex: 6
              // F
            },
            mergeType: "MERGE_ALL"
          }
        });
        mergeRequests.push({
          repeatCell: {
            range: {
              sheetId: newSheetId,
              startRowIndex: catRowIndex,
              endRowIndex: catRowIndex + 1,
              startColumnIndex: 1,
              // B
              endColumnIndex: 6
              // F
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 182 / 255,
                  green: 215 / 255,
                  blue: 168 / 255
                },
                textFormat: { bold: true },
                horizontalAlignment: "CENTER",
                verticalAlignment: "MIDDLE"
              }
            },
            fields: "userEnteredFormat(backgroundColor,textFormat(bold),horizontalAlignment,verticalAlignment)"
          }
        });
        if (Array.isArray(subtasks)) {
          for (const st of subtasks) {
            const steps = Array.isArray(st.steps) ? st.steps : [];
            const numSteps = steps.length || 1;
            const subtaskStartRow = currentRowIndex;
            for (let i = 0; i < numSteps; i++) {
              const stepRow = new Array(12).fill("");
              if (i === 0) {
                stepRow[1] = st.start_date || "";
                stepRow[2] = st.end_date || "";
                stepRow[3] = st.subtask || "";
              }
              stepRow[4] = steps[i] || "";
              stepRow[6] = "PASSED";
              stepRow[8] = "LOW";
              stepRow[9] = "SIMPLE";
              rows.push(stepRow);
              currentRowIndex++;
            }
            if (numSteps > 1) {
              [1, 2, 3].forEach((colIndex) => {
                mergeRequests.push({
                  mergeCells: {
                    range: {
                      sheetId: newSheetId,
                      startRowIndex: subtaskStartRow,
                      endRowIndex: subtaskStartRow + numSteps,
                      startColumnIndex: colIndex,
                      endColumnIndex: colIndex + 1
                    },
                    mergeType: "MERGE_ALL"
                  }
                });
                mergeRequests.push({
                  repeatCell: {
                    range: {
                      sheetId: newSheetId,
                      startRowIndex: subtaskStartRow,
                      endRowIndex: subtaskStartRow + numSteps,
                      startColumnIndex: colIndex,
                      endColumnIndex: colIndex + 1
                    },
                    cell: {
                      userEnteredFormat: {
                        verticalAlignment: "MIDDLE",
                        horizontalAlignment: colIndex === 3 ? "LEFT" : "CENTER"
                      }
                    },
                    fields: "userEnteredFormat(verticalAlignment,horizontalAlignment)"
                  }
                });
              });
            }
          }
        }
      }
      const range = `${sheetName}!A3:L${currentRowIndex}`;
      await this.updateValues(spreadsheetId, accessToken, range, rows);
      const finalRequests = [
        ...mergeRequests,
        // Xuống dòng tự động cho toàn bộ bảng
        {
          repeatCell: {
            range: {
              sheetId: newSheetId,
              startRowIndex: 2,
              endRowIndex: 2 + rows.length,
              startColumnIndex: 0,
              endColumnIndex: 12
            },
            cell: {
              userEnteredFormat: {
                wrapStrategy: "WRAP",
                verticalAlignment: "MIDDLE"
              }
            },
            fields: "userEnteredFormat(wrapStrategy,verticalAlignment)"
          }
        },
        // Vẽ border màu #674ea7 cho toàn bộ bảng
        {
          updateBorders: {
            range: {
              sheetId: newSheetId,
              startRowIndex: 2,
              endRowIndex: 2 + rows.length,
              startColumnIndex: 0,
              endColumnIndex: 12
            },
            top: {
              style: "SOLID",
              color: { red: 103 / 255, green: 78 / 255, blue: 167 / 255 }
            },
            bottom: {
              style: "SOLID",
              color: { red: 103 / 255, green: 78 / 255, blue: 167 / 255 }
            },
            left: {
              style: "SOLID",
              color: { red: 103 / 255, green: 78 / 255, blue: 167 / 255 }
            },
            right: {
              style: "SOLID",
              color: { red: 103 / 255, green: 78 / 255, blue: 167 / 255 }
            },
            innerHorizontal: {
              style: "SOLID",
              color: { red: 103 / 255, green: 78 / 255, blue: 167 / 255 }
            },
            innerVertical: {
              style: "SOLID",
              color: { red: 103 / 255, green: 78 / 255, blue: 167 / 255 }
            }
          }
        },
        // Copy format G, I, J
        {
          copyPaste: {
            source: {
              sheetId: newSheetId,
              startRowIndex: 2,
              endRowIndex: 3,
              startColumnIndex: 6,
              endColumnIndex: 7
            },
            destination: {
              sheetId: newSheetId,
              startRowIndex: 3,
              endRowIndex: 2 + rows.length,
              startColumnIndex: 6,
              endColumnIndex: 7
            },
            pasteType: "PASTE_NORMAL"
          }
        },
        {
          copyPaste: {
            source: {
              sheetId: newSheetId,
              startRowIndex: 2,
              endRowIndex: 3,
              startColumnIndex: 8,
              endColumnIndex: 9
            },
            destination: {
              sheetId: newSheetId,
              startRowIndex: 3,
              endRowIndex: 2 + rows.length,
              startColumnIndex: 8,
              endColumnIndex: 9
            },
            pasteType: "PASTE_NORMAL"
          }
        },
        {
          copyPaste: {
            source: {
              sheetId: newSheetId,
              startRowIndex: 2,
              endRowIndex: 3,
              startColumnIndex: 9,
              endColumnIndex: 10
            },
            destination: {
              sheetId: newSheetId,
              startRowIndex: 3,
              endRowIndex: 2 + rows.length,
              startColumnIndex: 9,
              endColumnIndex: 10
            },
            pasteType: "PASTE_NORMAL"
          }
        },
        {
          updateCells: {
            range: {
              sheetId: newSheetId,
              startRowIndex: 2,
              endRowIndex: 2 + rows.length,
              startColumnIndex: 0,
              endColumnIndex: 1
            },
            rows: [
              {
                values: [
                  {
                    userEnteredValue: { stringValue: task.id },
                    userEnteredFormat: {
                      verticalAlignment: "MIDDLE",
                      horizontalAlignment: "LEFT"
                    }
                  }
                ]
              }
            ],
            fields: "userEnteredValue,userEnteredFormat(verticalAlignment,horizontalAlignment)"
          }
        },
        {
          mergeCells: {
            range: {
              sheetId: newSheetId,
              startRowIndex: 2,
              endRowIndex: 2 + rows.length,
              startColumnIndex: 0,
              endColumnIndex: 1
            },
            mergeType: "MERGE_ALL"
          }
        }
      ];
      await this.batchUpdate(spreadsheetId, accessToken, finalRequests);
      await this.reorderSheets(spreadsheetId, accessToken);
      this.outputChannel.appendLine(
        `[Sheet] \u0110\xE3 t\u1EA1o v\xE0 \u0111\u1ED5 d\u1EEF li\u1EC7u v\xE0o sheet '${sheetName}' th\xE0nh c\xF4ng.`
      );
      return sheetName;
    } catch (error) {
      this.outputChannel.appendLine(
        `[Sheet] L\u1ED7i khi t\u1EA1o sheet chi ti\u1EBFt: ${error.message}`
      );
      throw error;
    }
  }
  /**
   * Sắp xếp lại thứ tự các sheet:
   * 1. Sheet SRINPT luôn nằm đầu tiên (index 0)
   * 2. Các sheet .Details sắp xếp giảm dần theo Task ID
   * 3. Các sheet còn lại (Template, v.v.) nằm sau cùng
   */
  async reorderSheets(spreadsheetId, accessToken) {
    try {
      this.outputChannel.appendLine(
        "[Sheet] \u0110ang t\u1EF1 \u0111\u1ED9ng s\u1EAFp x\u1EBFp l\u1EA1i th\u1EE9 t\u1EF1 c\xE1c sheet..."
      );
      const spreadsheet = await this.getSpreadsheet(
        spreadsheetId,
        accessToken
      );
      const allSheets = spreadsheet.sheets || [];
      const srinptSheet = allSheets.find(
        (s) => s.properties?.title === "SRINPT" || s.properties?.title === "SPRINT"
      );
      const detailsSheets = allSheets.filter(
        (s) => s.properties?.title?.endsWith(".Details")
      );
      const otherSheets = allSheets.filter(
        (s) => s.properties?.title !== "SRINPT" && s.properties?.title !== "SPRINT" && !s.properties?.title?.endsWith(".Details")
      );
      detailsSheets.sort(
        (a, b) => b.properties.title.localeCompare(a.properties.title, void 0, {
          numeric: true,
          sensitivity: "base"
        })
      );
      const sortedList = [];
      if (srinptSheet) {
        sortedList.push(srinptSheet);
      }
      sortedList.push(...detailsSheets);
      sortedList.push(...otherSheets);
      const requests = sortedList.map((s, idx) => ({
        updateSheetProperties: {
          properties: {
            sheetId: s.properties.sheetId,
            index: idx
          },
          fields: "index"
        }
      }));
      if (requests.length > 0) {
        await this.batchUpdate(spreadsheetId, accessToken, requests);
      }
    } catch (error) {
      this.outputChannel.appendLine(
        `[Sheet] Kh\xF4ng th\u1EC3 s\u1EAFp x\u1EBFp sheet: ${error.message}`
      );
    }
  }
  async getSpreadsheet(spreadsheetId, accessToken) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
      throw new Error(
        `L\u01B0u \xFD: Kh\xF4ng th\u1EC3 l\u1EA5y th\xF4ng tin Spreadsheet (${response.status})`
      );
    }
    return await response.json();
  }
  async batchUpdate(spreadsheetId, accessToken, requests) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ requests })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Sheets batchUpdate error: ${errorText}`);
    }
    return await response.json();
  }
  async updateValues(spreadsheetId, accessToken, range, values) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}?valueInputOption=USER_ENTERED`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ values })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Sheets updateValues error: ${errorText}`);
    }
  }
};

// node_modules/.pnpm/@google+generative-ai@0.24.1/node_modules/@google/generative-ai/dist/index.mjs
var SchemaType;
(function(SchemaType2) {
  SchemaType2["STRING"] = "string";
  SchemaType2["NUMBER"] = "number";
  SchemaType2["INTEGER"] = "integer";
  SchemaType2["BOOLEAN"] = "boolean";
  SchemaType2["ARRAY"] = "array";
  SchemaType2["OBJECT"] = "object";
})(SchemaType || (SchemaType = {}));
var ExecutableCodeLanguage;
(function(ExecutableCodeLanguage2) {
  ExecutableCodeLanguage2["LANGUAGE_UNSPECIFIED"] = "language_unspecified";
  ExecutableCodeLanguage2["PYTHON"] = "python";
})(ExecutableCodeLanguage || (ExecutableCodeLanguage = {}));
var Outcome;
(function(Outcome2) {
  Outcome2["OUTCOME_UNSPECIFIED"] = "outcome_unspecified";
  Outcome2["OUTCOME_OK"] = "outcome_ok";
  Outcome2["OUTCOME_FAILED"] = "outcome_failed";
  Outcome2["OUTCOME_DEADLINE_EXCEEDED"] = "outcome_deadline_exceeded";
})(Outcome || (Outcome = {}));
var POSSIBLE_ROLES = ["user", "model", "function", "system"];
var HarmCategory;
(function(HarmCategory2) {
  HarmCategory2["HARM_CATEGORY_UNSPECIFIED"] = "HARM_CATEGORY_UNSPECIFIED";
  HarmCategory2["HARM_CATEGORY_HATE_SPEECH"] = "HARM_CATEGORY_HATE_SPEECH";
  HarmCategory2["HARM_CATEGORY_SEXUALLY_EXPLICIT"] = "HARM_CATEGORY_SEXUALLY_EXPLICIT";
  HarmCategory2["HARM_CATEGORY_HARASSMENT"] = "HARM_CATEGORY_HARASSMENT";
  HarmCategory2["HARM_CATEGORY_DANGEROUS_CONTENT"] = "HARM_CATEGORY_DANGEROUS_CONTENT";
  HarmCategory2["HARM_CATEGORY_CIVIC_INTEGRITY"] = "HARM_CATEGORY_CIVIC_INTEGRITY";
})(HarmCategory || (HarmCategory = {}));
var HarmBlockThreshold;
(function(HarmBlockThreshold2) {
  HarmBlockThreshold2["HARM_BLOCK_THRESHOLD_UNSPECIFIED"] = "HARM_BLOCK_THRESHOLD_UNSPECIFIED";
  HarmBlockThreshold2["BLOCK_LOW_AND_ABOVE"] = "BLOCK_LOW_AND_ABOVE";
  HarmBlockThreshold2["BLOCK_MEDIUM_AND_ABOVE"] = "BLOCK_MEDIUM_AND_ABOVE";
  HarmBlockThreshold2["BLOCK_ONLY_HIGH"] = "BLOCK_ONLY_HIGH";
  HarmBlockThreshold2["BLOCK_NONE"] = "BLOCK_NONE";
})(HarmBlockThreshold || (HarmBlockThreshold = {}));
var HarmProbability;
(function(HarmProbability2) {
  HarmProbability2["HARM_PROBABILITY_UNSPECIFIED"] = "HARM_PROBABILITY_UNSPECIFIED";
  HarmProbability2["NEGLIGIBLE"] = "NEGLIGIBLE";
  HarmProbability2["LOW"] = "LOW";
  HarmProbability2["MEDIUM"] = "MEDIUM";
  HarmProbability2["HIGH"] = "HIGH";
})(HarmProbability || (HarmProbability = {}));
var BlockReason;
(function(BlockReason2) {
  BlockReason2["BLOCKED_REASON_UNSPECIFIED"] = "BLOCKED_REASON_UNSPECIFIED";
  BlockReason2["SAFETY"] = "SAFETY";
  BlockReason2["OTHER"] = "OTHER";
})(BlockReason || (BlockReason = {}));
var FinishReason;
(function(FinishReason2) {
  FinishReason2["FINISH_REASON_UNSPECIFIED"] = "FINISH_REASON_UNSPECIFIED";
  FinishReason2["STOP"] = "STOP";
  FinishReason2["MAX_TOKENS"] = "MAX_TOKENS";
  FinishReason2["SAFETY"] = "SAFETY";
  FinishReason2["RECITATION"] = "RECITATION";
  FinishReason2["LANGUAGE"] = "LANGUAGE";
  FinishReason2["BLOCKLIST"] = "BLOCKLIST";
  FinishReason2["PROHIBITED_CONTENT"] = "PROHIBITED_CONTENT";
  FinishReason2["SPII"] = "SPII";
  FinishReason2["MALFORMED_FUNCTION_CALL"] = "MALFORMED_FUNCTION_CALL";
  FinishReason2["OTHER"] = "OTHER";
})(FinishReason || (FinishReason = {}));
var TaskType;
(function(TaskType2) {
  TaskType2["TASK_TYPE_UNSPECIFIED"] = "TASK_TYPE_UNSPECIFIED";
  TaskType2["RETRIEVAL_QUERY"] = "RETRIEVAL_QUERY";
  TaskType2["RETRIEVAL_DOCUMENT"] = "RETRIEVAL_DOCUMENT";
  TaskType2["SEMANTIC_SIMILARITY"] = "SEMANTIC_SIMILARITY";
  TaskType2["CLASSIFICATION"] = "CLASSIFICATION";
  TaskType2["CLUSTERING"] = "CLUSTERING";
})(TaskType || (TaskType = {}));
var FunctionCallingMode;
(function(FunctionCallingMode2) {
  FunctionCallingMode2["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
  FunctionCallingMode2["AUTO"] = "AUTO";
  FunctionCallingMode2["ANY"] = "ANY";
  FunctionCallingMode2["NONE"] = "NONE";
})(FunctionCallingMode || (FunctionCallingMode = {}));
var DynamicRetrievalMode;
(function(DynamicRetrievalMode2) {
  DynamicRetrievalMode2["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
  DynamicRetrievalMode2["MODE_DYNAMIC"] = "MODE_DYNAMIC";
})(DynamicRetrievalMode || (DynamicRetrievalMode = {}));
var GoogleGenerativeAIError = class extends Error {
  constructor(message) {
    super(`[GoogleGenerativeAI Error]: ${message}`);
  }
};
var GoogleGenerativeAIResponseError = class extends GoogleGenerativeAIError {
  constructor(message, response) {
    super(message);
    this.response = response;
  }
};
var GoogleGenerativeAIFetchError = class extends GoogleGenerativeAIError {
  constructor(message, status, statusText, errorDetails) {
    super(message);
    this.status = status;
    this.statusText = statusText;
    this.errorDetails = errorDetails;
  }
};
var GoogleGenerativeAIRequestInputError = class extends GoogleGenerativeAIError {
};
var GoogleGenerativeAIAbortError = class extends GoogleGenerativeAIError {
};
var DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
var DEFAULT_API_VERSION = "v1beta";
var PACKAGE_VERSION = "0.24.1";
var PACKAGE_LOG_HEADER = "genai-js";
var Task;
(function(Task2) {
  Task2["GENERATE_CONTENT"] = "generateContent";
  Task2["STREAM_GENERATE_CONTENT"] = "streamGenerateContent";
  Task2["COUNT_TOKENS"] = "countTokens";
  Task2["EMBED_CONTENT"] = "embedContent";
  Task2["BATCH_EMBED_CONTENTS"] = "batchEmbedContents";
})(Task || (Task = {}));
var RequestUrl = class {
  constructor(model, task, apiKey, stream, requestOptions) {
    this.model = model;
    this.task = task;
    this.apiKey = apiKey;
    this.stream = stream;
    this.requestOptions = requestOptions;
  }
  toString() {
    var _a, _b;
    const apiVersion = ((_a = this.requestOptions) === null || _a === void 0 ? void 0 : _a.apiVersion) || DEFAULT_API_VERSION;
    const baseUrl = ((_b = this.requestOptions) === null || _b === void 0 ? void 0 : _b.baseUrl) || DEFAULT_BASE_URL;
    let url = `${baseUrl}/${apiVersion}/${this.model}:${this.task}`;
    if (this.stream) {
      url += "?alt=sse";
    }
    return url;
  }
};
function getClientHeaders(requestOptions) {
  const clientHeaders = [];
  if (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.apiClient) {
    clientHeaders.push(requestOptions.apiClient);
  }
  clientHeaders.push(`${PACKAGE_LOG_HEADER}/${PACKAGE_VERSION}`);
  return clientHeaders.join(" ");
}
async function getHeaders(url) {
  var _a;
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("x-goog-api-client", getClientHeaders(url.requestOptions));
  headers.append("x-goog-api-key", url.apiKey);
  let customHeaders = (_a = url.requestOptions) === null || _a === void 0 ? void 0 : _a.customHeaders;
  if (customHeaders) {
    if (!(customHeaders instanceof Headers)) {
      try {
        customHeaders = new Headers(customHeaders);
      } catch (e) {
        throw new GoogleGenerativeAIRequestInputError(`unable to convert customHeaders value ${JSON.stringify(customHeaders)} to Headers: ${e.message}`);
      }
    }
    for (const [headerName, headerValue] of customHeaders.entries()) {
      if (headerName === "x-goog-api-key") {
        throw new GoogleGenerativeAIRequestInputError(`Cannot set reserved header name ${headerName}`);
      } else if (headerName === "x-goog-api-client") {
        throw new GoogleGenerativeAIRequestInputError(`Header name ${headerName} can only be set using the apiClient field`);
      }
      headers.append(headerName, headerValue);
    }
  }
  return headers;
}
async function constructModelRequest(model, task, apiKey, stream, body, requestOptions) {
  const url = new RequestUrl(model, task, apiKey, stream, requestOptions);
  return {
    url: url.toString(),
    fetchOptions: Object.assign(Object.assign({}, buildFetchOptions(requestOptions)), { method: "POST", headers: await getHeaders(url), body })
  };
}
async function makeModelRequest(model, task, apiKey, stream, body, requestOptions = {}, fetchFn = fetch) {
  const { url, fetchOptions } = await constructModelRequest(model, task, apiKey, stream, body, requestOptions);
  return makeRequest(url, fetchOptions, fetchFn);
}
async function makeRequest(url, fetchOptions, fetchFn = fetch) {
  let response;
  try {
    response = await fetchFn(url, fetchOptions);
  } catch (e) {
    handleResponseError(e, url);
  }
  if (!response.ok) {
    await handleResponseNotOk(response, url);
  }
  return response;
}
function handleResponseError(e, url) {
  let err = e;
  if (err.name === "AbortError") {
    err = new GoogleGenerativeAIAbortError(`Request aborted when fetching ${url.toString()}: ${e.message}`);
    err.stack = e.stack;
  } else if (!(e instanceof GoogleGenerativeAIFetchError || e instanceof GoogleGenerativeAIRequestInputError)) {
    err = new GoogleGenerativeAIError(`Error fetching from ${url.toString()}: ${e.message}`);
    err.stack = e.stack;
  }
  throw err;
}
async function handleResponseNotOk(response, url) {
  let message = "";
  let errorDetails;
  try {
    const json = await response.json();
    message = json.error.message;
    if (json.error.details) {
      message += ` ${JSON.stringify(json.error.details)}`;
      errorDetails = json.error.details;
    }
  } catch (e) {
  }
  throw new GoogleGenerativeAIFetchError(`Error fetching from ${url.toString()}: [${response.status} ${response.statusText}] ${message}`, response.status, response.statusText, errorDetails);
}
function buildFetchOptions(requestOptions) {
  const fetchOptions = {};
  if ((requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.signal) !== void 0 || (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeout) >= 0) {
    const controller = new AbortController();
    if ((requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeout) >= 0) {
      setTimeout(() => controller.abort(), requestOptions.timeout);
    }
    if (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.signal) {
      requestOptions.signal.addEventListener("abort", () => {
        controller.abort();
      });
    }
    fetchOptions.signal = controller.signal;
  }
  return fetchOptions;
}
function addHelpers(response) {
  response.text = () => {
    if (response.candidates && response.candidates.length > 0) {
      if (response.candidates.length > 1) {
        console.warn(`This response had ${response.candidates.length} candidates. Returning text from the first candidate only. Access response.candidates directly to use the other candidates.`);
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw new GoogleGenerativeAIResponseError(`${formatBlockErrorMessage(response)}`, response);
      }
      return getText(response);
    } else if (response.promptFeedback) {
      throw new GoogleGenerativeAIResponseError(`Text not available. ${formatBlockErrorMessage(response)}`, response);
    }
    return "";
  };
  response.functionCall = () => {
    if (response.candidates && response.candidates.length > 0) {
      if (response.candidates.length > 1) {
        console.warn(`This response had ${response.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`);
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw new GoogleGenerativeAIResponseError(`${formatBlockErrorMessage(response)}`, response);
      }
      console.warn(`response.functionCall() is deprecated. Use response.functionCalls() instead.`);
      return getFunctionCalls(response)[0];
    } else if (response.promptFeedback) {
      throw new GoogleGenerativeAIResponseError(`Function call not available. ${formatBlockErrorMessage(response)}`, response);
    }
    return void 0;
  };
  response.functionCalls = () => {
    if (response.candidates && response.candidates.length > 0) {
      if (response.candidates.length > 1) {
        console.warn(`This response had ${response.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`);
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw new GoogleGenerativeAIResponseError(`${formatBlockErrorMessage(response)}`, response);
      }
      return getFunctionCalls(response);
    } else if (response.promptFeedback) {
      throw new GoogleGenerativeAIResponseError(`Function call not available. ${formatBlockErrorMessage(response)}`, response);
    }
    return void 0;
  };
  return response;
}
function getText(response) {
  var _a, _b, _c, _d;
  const textStrings = [];
  if ((_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0].content) === null || _b === void 0 ? void 0 : _b.parts) {
    for (const part of (_d = (_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0].content) === null || _d === void 0 ? void 0 : _d.parts) {
      if (part.text) {
        textStrings.push(part.text);
      }
      if (part.executableCode) {
        textStrings.push("\n```" + part.executableCode.language + "\n" + part.executableCode.code + "\n```\n");
      }
      if (part.codeExecutionResult) {
        textStrings.push("\n```\n" + part.codeExecutionResult.output + "\n```\n");
      }
    }
  }
  if (textStrings.length > 0) {
    return textStrings.join("");
  } else {
    return "";
  }
}
function getFunctionCalls(response) {
  var _a, _b, _c, _d;
  const functionCalls = [];
  if ((_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0].content) === null || _b === void 0 ? void 0 : _b.parts) {
    for (const part of (_d = (_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0].content) === null || _d === void 0 ? void 0 : _d.parts) {
      if (part.functionCall) {
        functionCalls.push(part.functionCall);
      }
    }
  }
  if (functionCalls.length > 0) {
    return functionCalls;
  } else {
    return void 0;
  }
}
var badFinishReasons = [
  FinishReason.RECITATION,
  FinishReason.SAFETY,
  FinishReason.LANGUAGE
];
function hadBadFinishReason(candidate) {
  return !!candidate.finishReason && badFinishReasons.includes(candidate.finishReason);
}
function formatBlockErrorMessage(response) {
  var _a, _b, _c;
  let message = "";
  if ((!response.candidates || response.candidates.length === 0) && response.promptFeedback) {
    message += "Response was blocked";
    if ((_a = response.promptFeedback) === null || _a === void 0 ? void 0 : _a.blockReason) {
      message += ` due to ${response.promptFeedback.blockReason}`;
    }
    if ((_b = response.promptFeedback) === null || _b === void 0 ? void 0 : _b.blockReasonMessage) {
      message += `: ${response.promptFeedback.blockReasonMessage}`;
    }
  } else if ((_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0]) {
    const firstCandidate = response.candidates[0];
    if (hadBadFinishReason(firstCandidate)) {
      message += `Candidate was blocked due to ${firstCandidate.finishReason}`;
      if (firstCandidate.finishMessage) {
        message += `: ${firstCandidate.finishMessage}`;
      }
    }
  }
  return message;
}
function __await(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
}
function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
    return this;
  }, i;
  function verb(n) {
    if (g[n]) i[n] = function(v) {
      return new Promise(function(a, b) {
        q.push([n, v, a, b]) > 1 || resume(n, v);
      });
    };
  }
  function resume(n, v) {
    try {
      step(g[n](v));
    } catch (e) {
      settle(q[0][3], e);
    }
  }
  function step(r) {
    r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
  }
  function fulfill(value) {
    resume("next", value);
  }
  function reject(value) {
    resume("throw", value);
  }
  function settle(f, v) {
    if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
  }
}
var responseLineRE = /^data\: (.*)(?:\n\n|\r\r|\r\n\r\n)/;
function processStream(response) {
  const inputStream = response.body.pipeThrough(new TextDecoderStream("utf8", { fatal: true }));
  const responseStream = getResponseStream(inputStream);
  const [stream1, stream2] = responseStream.tee();
  return {
    stream: generateResponseSequence(stream1),
    response: getResponsePromise(stream2)
  };
}
async function getResponsePromise(stream) {
  const allResponses = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return addHelpers(aggregateResponses(allResponses));
    }
    allResponses.push(value);
  }
}
function generateResponseSequence(stream) {
  return __asyncGenerator(this, arguments, function* generateResponseSequence_1() {
    const reader = stream.getReader();
    while (true) {
      const { value, done } = yield __await(reader.read());
      if (done) {
        break;
      }
      yield yield __await(addHelpers(value));
    }
  });
}
function getResponseStream(inputStream) {
  const reader = inputStream.getReader();
  const stream = new ReadableStream({
    start(controller) {
      let currentText = "";
      return pump();
      function pump() {
        return reader.read().then(({ value, done }) => {
          if (done) {
            if (currentText.trim()) {
              controller.error(new GoogleGenerativeAIError("Failed to parse stream"));
              return;
            }
            controller.close();
            return;
          }
          currentText += value;
          let match = currentText.match(responseLineRE);
          let parsedResponse;
          while (match) {
            try {
              parsedResponse = JSON.parse(match[1]);
            } catch (e) {
              controller.error(new GoogleGenerativeAIError(`Error parsing JSON response: "${match[1]}"`));
              return;
            }
            controller.enqueue(parsedResponse);
            currentText = currentText.substring(match[0].length);
            match = currentText.match(responseLineRE);
          }
          return pump();
        }).catch((e) => {
          let err = e;
          err.stack = e.stack;
          if (err.name === "AbortError") {
            err = new GoogleGenerativeAIAbortError("Request aborted when reading from the stream");
          } else {
            err = new GoogleGenerativeAIError("Error reading from the stream");
          }
          throw err;
        });
      }
    }
  });
  return stream;
}
function aggregateResponses(responses) {
  const lastResponse = responses[responses.length - 1];
  const aggregatedResponse = {
    promptFeedback: lastResponse === null || lastResponse === void 0 ? void 0 : lastResponse.promptFeedback
  };
  for (const response of responses) {
    if (response.candidates) {
      let candidateIndex = 0;
      for (const candidate of response.candidates) {
        if (!aggregatedResponse.candidates) {
          aggregatedResponse.candidates = [];
        }
        if (!aggregatedResponse.candidates[candidateIndex]) {
          aggregatedResponse.candidates[candidateIndex] = {
            index: candidateIndex
          };
        }
        aggregatedResponse.candidates[candidateIndex].citationMetadata = candidate.citationMetadata;
        aggregatedResponse.candidates[candidateIndex].groundingMetadata = candidate.groundingMetadata;
        aggregatedResponse.candidates[candidateIndex].finishReason = candidate.finishReason;
        aggregatedResponse.candidates[candidateIndex].finishMessage = candidate.finishMessage;
        aggregatedResponse.candidates[candidateIndex].safetyRatings = candidate.safetyRatings;
        if (candidate.content && candidate.content.parts) {
          if (!aggregatedResponse.candidates[candidateIndex].content) {
            aggregatedResponse.candidates[candidateIndex].content = {
              role: candidate.content.role || "user",
              parts: []
            };
          }
          const newPart = {};
          for (const part of candidate.content.parts) {
            if (part.text) {
              newPart.text = part.text;
            }
            if (part.functionCall) {
              newPart.functionCall = part.functionCall;
            }
            if (part.executableCode) {
              newPart.executableCode = part.executableCode;
            }
            if (part.codeExecutionResult) {
              newPart.codeExecutionResult = part.codeExecutionResult;
            }
            if (Object.keys(newPart).length === 0) {
              newPart.text = "";
            }
            aggregatedResponse.candidates[candidateIndex].content.parts.push(newPart);
          }
        }
      }
      candidateIndex++;
    }
    if (response.usageMetadata) {
      aggregatedResponse.usageMetadata = response.usageMetadata;
    }
  }
  return aggregatedResponse;
}
async function generateContentStream(apiKey, model, params, requestOptions) {
  const response = await makeModelRequest(
    model,
    Task.STREAM_GENERATE_CONTENT,
    apiKey,
    /* stream */
    true,
    JSON.stringify(params),
    requestOptions
  );
  return processStream(response);
}
async function generateContent(apiKey, model, params, requestOptions) {
  const response = await makeModelRequest(
    model,
    Task.GENERATE_CONTENT,
    apiKey,
    /* stream */
    false,
    JSON.stringify(params),
    requestOptions
  );
  const responseJson = await response.json();
  const enhancedResponse = addHelpers(responseJson);
  return {
    response: enhancedResponse
  };
}
function formatSystemInstruction(input) {
  if (input == null) {
    return void 0;
  } else if (typeof input === "string") {
    return { role: "system", parts: [{ text: input }] };
  } else if (input.text) {
    return { role: "system", parts: [input] };
  } else if (input.parts) {
    if (!input.role) {
      return { role: "system", parts: input.parts };
    } else {
      return input;
    }
  }
}
function formatNewContent(request) {
  let newParts = [];
  if (typeof request === "string") {
    newParts = [{ text: request }];
  } else {
    for (const partOrString of request) {
      if (typeof partOrString === "string") {
        newParts.push({ text: partOrString });
      } else {
        newParts.push(partOrString);
      }
    }
  }
  return assignRoleToPartsAndValidateSendMessageRequest(newParts);
}
function assignRoleToPartsAndValidateSendMessageRequest(parts) {
  const userContent = { role: "user", parts: [] };
  const functionContent = { role: "function", parts: [] };
  let hasUserContent = false;
  let hasFunctionContent = false;
  for (const part of parts) {
    if ("functionResponse" in part) {
      functionContent.parts.push(part);
      hasFunctionContent = true;
    } else {
      userContent.parts.push(part);
      hasUserContent = true;
    }
  }
  if (hasUserContent && hasFunctionContent) {
    throw new GoogleGenerativeAIError("Within a single message, FunctionResponse cannot be mixed with other type of part in the request for sending chat message.");
  }
  if (!hasUserContent && !hasFunctionContent) {
    throw new GoogleGenerativeAIError("No content is provided for sending chat message.");
  }
  if (hasUserContent) {
    return userContent;
  }
  return functionContent;
}
function formatCountTokensInput(params, modelParams) {
  var _a;
  let formattedGenerateContentRequest = {
    model: modelParams === null || modelParams === void 0 ? void 0 : modelParams.model,
    generationConfig: modelParams === null || modelParams === void 0 ? void 0 : modelParams.generationConfig,
    safetySettings: modelParams === null || modelParams === void 0 ? void 0 : modelParams.safetySettings,
    tools: modelParams === null || modelParams === void 0 ? void 0 : modelParams.tools,
    toolConfig: modelParams === null || modelParams === void 0 ? void 0 : modelParams.toolConfig,
    systemInstruction: modelParams === null || modelParams === void 0 ? void 0 : modelParams.systemInstruction,
    cachedContent: (_a = modelParams === null || modelParams === void 0 ? void 0 : modelParams.cachedContent) === null || _a === void 0 ? void 0 : _a.name,
    contents: []
  };
  const containsGenerateContentRequest = params.generateContentRequest != null;
  if (params.contents) {
    if (containsGenerateContentRequest) {
      throw new GoogleGenerativeAIRequestInputError("CountTokensRequest must have one of contents or generateContentRequest, not both.");
    }
    formattedGenerateContentRequest.contents = params.contents;
  } else if (containsGenerateContentRequest) {
    formattedGenerateContentRequest = Object.assign(Object.assign({}, formattedGenerateContentRequest), params.generateContentRequest);
  } else {
    const content = formatNewContent(params);
    formattedGenerateContentRequest.contents = [content];
  }
  return { generateContentRequest: formattedGenerateContentRequest };
}
function formatGenerateContentInput(params) {
  let formattedRequest;
  if (params.contents) {
    formattedRequest = params;
  } else {
    const content = formatNewContent(params);
    formattedRequest = { contents: [content] };
  }
  if (params.systemInstruction) {
    formattedRequest.systemInstruction = formatSystemInstruction(params.systemInstruction);
  }
  return formattedRequest;
}
function formatEmbedContentInput(params) {
  if (typeof params === "string" || Array.isArray(params)) {
    const content = formatNewContent(params);
    return { content };
  }
  return params;
}
var VALID_PART_FIELDS = [
  "text",
  "inlineData",
  "functionCall",
  "functionResponse",
  "executableCode",
  "codeExecutionResult"
];
var VALID_PARTS_PER_ROLE = {
  user: ["text", "inlineData"],
  function: ["functionResponse"],
  model: ["text", "functionCall", "executableCode", "codeExecutionResult"],
  // System instructions shouldn't be in history anyway.
  system: ["text"]
};
function validateChatHistory(history) {
  let prevContent = false;
  for (const currContent of history) {
    const { role, parts } = currContent;
    if (!prevContent && role !== "user") {
      throw new GoogleGenerativeAIError(`First content should be with role 'user', got ${role}`);
    }
    if (!POSSIBLE_ROLES.includes(role)) {
      throw new GoogleGenerativeAIError(`Each item should include role field. Got ${role} but valid roles are: ${JSON.stringify(POSSIBLE_ROLES)}`);
    }
    if (!Array.isArray(parts)) {
      throw new GoogleGenerativeAIError("Content should have 'parts' property with an array of Parts");
    }
    if (parts.length === 0) {
      throw new GoogleGenerativeAIError("Each Content should have at least one part");
    }
    const countFields = {
      text: 0,
      inlineData: 0,
      functionCall: 0,
      functionResponse: 0,
      fileData: 0,
      executableCode: 0,
      codeExecutionResult: 0
    };
    for (const part of parts) {
      for (const key of VALID_PART_FIELDS) {
        if (key in part) {
          countFields[key] += 1;
        }
      }
    }
    const validParts = VALID_PARTS_PER_ROLE[role];
    for (const key of VALID_PART_FIELDS) {
      if (!validParts.includes(key) && countFields[key] > 0) {
        throw new GoogleGenerativeAIError(`Content with role '${role}' can't contain '${key}' part`);
      }
    }
    prevContent = true;
  }
}
function isValidResponse(response) {
  var _a;
  if (response.candidates === void 0 || response.candidates.length === 0) {
    return false;
  }
  const content = (_a = response.candidates[0]) === null || _a === void 0 ? void 0 : _a.content;
  if (content === void 0) {
    return false;
  }
  if (content.parts === void 0 || content.parts.length === 0) {
    return false;
  }
  for (const part of content.parts) {
    if (part === void 0 || Object.keys(part).length === 0) {
      return false;
    }
    if (part.text !== void 0 && part.text === "") {
      return false;
    }
  }
  return true;
}
var SILENT_ERROR = "SILENT_ERROR";
var ChatSession = class {
  constructor(apiKey, model, params, _requestOptions = {}) {
    this.model = model;
    this.params = params;
    this._requestOptions = _requestOptions;
    this._history = [];
    this._sendPromise = Promise.resolve();
    this._apiKey = apiKey;
    if (params === null || params === void 0 ? void 0 : params.history) {
      validateChatHistory(params.history);
      this._history = params.history;
    }
  }
  /**
   * Gets the chat history so far. Blocked prompts are not added to history.
   * Blocked candidates are not added to history, nor are the prompts that
   * generated them.
   */
  async getHistory() {
    await this._sendPromise;
    return this._history;
  }
  /**
   * Sends a chat message and receives a non-streaming
   * {@link GenerateContentResult}.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async sendMessage(request, requestOptions = {}) {
    var _a, _b, _c, _d, _e, _f;
    await this._sendPromise;
    const newContent = formatNewContent(request);
    const generateContentRequest = {
      safetySettings: (_a = this.params) === null || _a === void 0 ? void 0 : _a.safetySettings,
      generationConfig: (_b = this.params) === null || _b === void 0 ? void 0 : _b.generationConfig,
      tools: (_c = this.params) === null || _c === void 0 ? void 0 : _c.tools,
      toolConfig: (_d = this.params) === null || _d === void 0 ? void 0 : _d.toolConfig,
      systemInstruction: (_e = this.params) === null || _e === void 0 ? void 0 : _e.systemInstruction,
      cachedContent: (_f = this.params) === null || _f === void 0 ? void 0 : _f.cachedContent,
      contents: [...this._history, newContent]
    };
    const chatSessionRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
    let finalResult;
    this._sendPromise = this._sendPromise.then(() => generateContent(this._apiKey, this.model, generateContentRequest, chatSessionRequestOptions)).then((result) => {
      var _a2;
      if (isValidResponse(result.response)) {
        this._history.push(newContent);
        const responseContent = Object.assign({
          parts: [],
          // Response seems to come back without a role set.
          role: "model"
        }, (_a2 = result.response.candidates) === null || _a2 === void 0 ? void 0 : _a2[0].content);
        this._history.push(responseContent);
      } else {
        const blockErrorMessage = formatBlockErrorMessage(result.response);
        if (blockErrorMessage) {
          console.warn(`sendMessage() was unsuccessful. ${blockErrorMessage}. Inspect response object for details.`);
        }
      }
      finalResult = result;
    }).catch((e) => {
      this._sendPromise = Promise.resolve();
      throw e;
    });
    await this._sendPromise;
    return finalResult;
  }
  /**
   * Sends a chat message and receives the response as a
   * {@link GenerateContentStreamResult} containing an iterable stream
   * and a response promise.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async sendMessageStream(request, requestOptions = {}) {
    var _a, _b, _c, _d, _e, _f;
    await this._sendPromise;
    const newContent = formatNewContent(request);
    const generateContentRequest = {
      safetySettings: (_a = this.params) === null || _a === void 0 ? void 0 : _a.safetySettings,
      generationConfig: (_b = this.params) === null || _b === void 0 ? void 0 : _b.generationConfig,
      tools: (_c = this.params) === null || _c === void 0 ? void 0 : _c.tools,
      toolConfig: (_d = this.params) === null || _d === void 0 ? void 0 : _d.toolConfig,
      systemInstruction: (_e = this.params) === null || _e === void 0 ? void 0 : _e.systemInstruction,
      cachedContent: (_f = this.params) === null || _f === void 0 ? void 0 : _f.cachedContent,
      contents: [...this._history, newContent]
    };
    const chatSessionRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
    const streamPromise = generateContentStream(this._apiKey, this.model, generateContentRequest, chatSessionRequestOptions);
    this._sendPromise = this._sendPromise.then(() => streamPromise).catch((_ignored) => {
      throw new Error(SILENT_ERROR);
    }).then((streamResult) => streamResult.response).then((response) => {
      if (isValidResponse(response)) {
        this._history.push(newContent);
        const responseContent = Object.assign({}, response.candidates[0].content);
        if (!responseContent.role) {
          responseContent.role = "model";
        }
        this._history.push(responseContent);
      } else {
        const blockErrorMessage = formatBlockErrorMessage(response);
        if (blockErrorMessage) {
          console.warn(`sendMessageStream() was unsuccessful. ${blockErrorMessage}. Inspect response object for details.`);
        }
      }
    }).catch((e) => {
      if (e.message !== SILENT_ERROR) {
        console.error(e);
      }
    });
    return streamPromise;
  }
};
async function countTokens(apiKey, model, params, singleRequestOptions) {
  const response = await makeModelRequest(model, Task.COUNT_TOKENS, apiKey, false, JSON.stringify(params), singleRequestOptions);
  return response.json();
}
async function embedContent(apiKey, model, params, requestOptions) {
  const response = await makeModelRequest(model, Task.EMBED_CONTENT, apiKey, false, JSON.stringify(params), requestOptions);
  return response.json();
}
async function batchEmbedContents(apiKey, model, params, requestOptions) {
  const requestsWithModel = params.requests.map((request) => {
    return Object.assign(Object.assign({}, request), { model });
  });
  const response = await makeModelRequest(model, Task.BATCH_EMBED_CONTENTS, apiKey, false, JSON.stringify({ requests: requestsWithModel }), requestOptions);
  return response.json();
}
var GenerativeModel = class {
  constructor(apiKey, modelParams, _requestOptions = {}) {
    this.apiKey = apiKey;
    this._requestOptions = _requestOptions;
    if (modelParams.model.includes("/")) {
      this.model = modelParams.model;
    } else {
      this.model = `models/${modelParams.model}`;
    }
    this.generationConfig = modelParams.generationConfig || {};
    this.safetySettings = modelParams.safetySettings || [];
    this.tools = modelParams.tools;
    this.toolConfig = modelParams.toolConfig;
    this.systemInstruction = formatSystemInstruction(modelParams.systemInstruction);
    this.cachedContent = modelParams.cachedContent;
  }
  /**
   * Makes a single non-streaming call to the model
   * and returns an object containing a single {@link GenerateContentResponse}.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async generateContent(request, requestOptions = {}) {
    var _a;
    const formattedParams = formatGenerateContentInput(request);
    const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
    return generateContent(this.apiKey, this.model, Object.assign({ generationConfig: this.generationConfig, safetySettings: this.safetySettings, tools: this.tools, toolConfig: this.toolConfig, systemInstruction: this.systemInstruction, cachedContent: (_a = this.cachedContent) === null || _a === void 0 ? void 0 : _a.name }, formattedParams), generativeModelRequestOptions);
  }
  /**
   * Makes a single streaming call to the model and returns an object
   * containing an iterable stream that iterates over all chunks in the
   * streaming response as well as a promise that returns the final
   * aggregated response.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async generateContentStream(request, requestOptions = {}) {
    var _a;
    const formattedParams = formatGenerateContentInput(request);
    const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
    return generateContentStream(this.apiKey, this.model, Object.assign({ generationConfig: this.generationConfig, safetySettings: this.safetySettings, tools: this.tools, toolConfig: this.toolConfig, systemInstruction: this.systemInstruction, cachedContent: (_a = this.cachedContent) === null || _a === void 0 ? void 0 : _a.name }, formattedParams), generativeModelRequestOptions);
  }
  /**
   * Gets a new {@link ChatSession} instance which can be used for
   * multi-turn chats.
   */
  startChat(startChatParams) {
    var _a;
    return new ChatSession(this.apiKey, this.model, Object.assign({ generationConfig: this.generationConfig, safetySettings: this.safetySettings, tools: this.tools, toolConfig: this.toolConfig, systemInstruction: this.systemInstruction, cachedContent: (_a = this.cachedContent) === null || _a === void 0 ? void 0 : _a.name }, startChatParams), this._requestOptions);
  }
  /**
   * Counts the tokens in the provided request.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async countTokens(request, requestOptions = {}) {
    const formattedParams = formatCountTokensInput(request, {
      model: this.model,
      generationConfig: this.generationConfig,
      safetySettings: this.safetySettings,
      tools: this.tools,
      toolConfig: this.toolConfig,
      systemInstruction: this.systemInstruction,
      cachedContent: this.cachedContent
    });
    const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
    return countTokens(this.apiKey, this.model, formattedParams, generativeModelRequestOptions);
  }
  /**
   * Embeds the provided content.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async embedContent(request, requestOptions = {}) {
    const formattedParams = formatEmbedContentInput(request);
    const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
    return embedContent(this.apiKey, this.model, formattedParams, generativeModelRequestOptions);
  }
  /**
   * Embeds an array of {@link EmbedContentRequest}s.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async batchEmbedContents(batchEmbedContentRequest, requestOptions = {}) {
    const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
    return batchEmbedContents(this.apiKey, this.model, batchEmbedContentRequest, generativeModelRequestOptions);
  }
};
var GoogleGenerativeAI = class {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }
  /**
   * Gets a {@link GenerativeModel} instance for the provided model name.
   */
  getGenerativeModel(modelParams, requestOptions) {
    if (!modelParams.model) {
      throw new GoogleGenerativeAIError(`Must provide a model name. Example: genai.getGenerativeModel({ model: 'my-model-name' })`);
    }
    return new GenerativeModel(this.apiKey, modelParams, requestOptions);
  }
  /**
   * Creates a {@link GenerativeModel} instance from provided content cache.
   */
  getGenerativeModelFromCachedContent(cachedContent, modelParams, requestOptions) {
    if (!cachedContent.name) {
      throw new GoogleGenerativeAIRequestInputError("Cached content must contain a `name` field.");
    }
    if (!cachedContent.model) {
      throw new GoogleGenerativeAIRequestInputError("Cached content must contain a `model` field.");
    }
    const disallowedDuplicates = ["model", "systemInstruction"];
    for (const key of disallowedDuplicates) {
      if ((modelParams === null || modelParams === void 0 ? void 0 : modelParams[key]) && cachedContent[key] && (modelParams === null || modelParams === void 0 ? void 0 : modelParams[key]) !== cachedContent[key]) {
        if (key === "model") {
          const modelParamsComp = modelParams.model.startsWith("models/") ? modelParams.model.replace("models/", "") : modelParams.model;
          const cachedContentComp = cachedContent.model.startsWith("models/") ? cachedContent.model.replace("models/", "") : cachedContent.model;
          if (modelParamsComp === cachedContentComp) {
            continue;
          }
        }
        throw new GoogleGenerativeAIRequestInputError(`Different value for "${key}" specified in modelParams (${modelParams[key]}) and cachedContent (${cachedContent[key]})`);
      }
    }
    const modelParamsFromCache = Object.assign(Object.assign({}, modelParams), { model: cachedContent.model, tools: cachedContent.tools, toolConfig: cachedContent.toolConfig, systemInstruction: cachedContent.systemInstruction, cachedContent });
    return new GenerativeModel(this.apiKey, modelParamsFromCache, requestOptions);
  }
};

// src/prompt/sheet.prompt.ts
var sheetPrompt = `
B\u1EA1n l\xE0 m\u1ED9t chuy\xEAn gia ph\xE2n t\xEDch y\xEAu c\u1EA7u v\xE0 ph\xE2n r\xE3 c\xF4ng vi\u1EC7c (task breakdown) cho d\u1EF1 \xE1n ph\u1EA7n m\u1EC1m.

NHI\u1EC6M V\u1EE4:
D\u1EF1a v\xE0o c\xE1c file code (tsx, ts...) v\xE0 h\xECnh \u1EA3nh giao di\u1EC7n \u0111\u01B0\u1EE3c cung c\u1EA5p, h\xE3y ph\xE2n t\xEDch v\xE0 t\u1EA1o danh s\xE1ch subtask chi ti\u1EBFt cho c\xE1c task \u0111\u01B0\u1EE3c ch\u1ECDn.

INPUT:
1. Danh s\xE1ch c\xE1c Task & User Story \u0111\u01B0\u1EE3c ch\u1ECDn.
2. N\u1ED9i dung c\xE1c file Code li\xEAn quan.
3. H\xECnh \u1EA3nh UI (n\u1EBFu c\xF3).

OUTPUT FORMAT (JSON):
Tr\u1EA3 v\u1EC1 JSON object v\u1EDBi key l\xE0 "T\xEAn nh\xF3m vi\u1EC7c" (Level 1 - D\u1EF1a theo input "1. ...", "1.1. ...", "1.2. ...").
Value l\xE0 m\u1ED9t m\u1EA3ng c\xE1c object, m\u1ED7i object \u0111\u1EA1i di\u1EC7n cho m\u1ED9t \u0111\u1EA7u vi\u1EC7c con v\xE0 c\xE1c b\u01B0\u1EDBc th\u1EF1c hi\u1EC7n.

QUAN TR\u1ECCNG: C\u1EA5u tr\xFAc JSON ph\u1EB3ng, kh\xF4ng l\u1ED3ng v\xE0o Task ID. Key l\xE0 t\xEAn c\u1EE7a Level 1 (VD: "1. Design & Coding").

C\u1EA5u tr\xFAc:
{
  "1. Design & Coding": [ // T\xEAn nh\xF3m vi\u1EC7c (Level 1)
    {
      "subtask": "1.1. T\xEAn subtask (Level 2)", 
      "start_date": "dd/mm/yyyy", // Ng\xE0y b\u1EAFt \u0111\u1EA7u
      "end_date": "dd/mm/yyyy", // Ng\xE0y k\u1EBFt th\xFAc
      "steps": [ // C\xE1c b\u01B0\u1EDBc chi ti\u1EBFt (Level 3)
        "1.1.1. B\u01B0\u1EDBc 1",
        "1.1.2. B\u01B0\u1EDBc 2"
      ]
    },
    ...
  ]
}

V\xED d\u1EE5 Output:
{
  "1. Design & Coding": [
    {
      "subtask": "1.1. X\u1EED l\xFD select all",
      "start_date": "24/10/2023",
      "end_date": "25/10/2023",
      "steps": [
        "1.1.1. Th\xEAm n\xFAt 'Ch\u1ECDn t\u1EA5t c\u1EA3'.",
        "1.1.2. X\u1EED l\xFD logic ch\u1ECDn."
      ]
    },
    {
      "subtask": "1.2. S\u1EAFp x\u1EBFp tr\u1EA1ng th\xE1i",
      "start_date": "24/10/2023",
      "end_date": "25/10/2023",
      "steps": [
        "1.2.1. Nh\xF3m b\xE1o c\xE1o theo tr\u1EA1ng th\xE1i.",
        "1.2.2. S\u1EAFp x\u1EBFp th\u1EE9 t\u1EF1 hi\u1EC3n th\u1ECB."
      ]
    }
  ],
  "2. Update Document & Sheet": [
    {
      "subtask": "2.1. Update document",
      "start_date": "24/10/2023",
      "end_date": "25/10/2023",
      "steps": ["2.1.1 Update document"]
    },
    {
      "subtask": "2.2. Update sheet details",
      "start_date": "24/10/2023",
      "end_date": "25/10/2023",
      "steps": ["2.2.1 Update sheet details"]
    }
  ]
}

QUY T\u1EAEC:
1. Key c\u1EE7a JSON Object l\xE0 t\xEAn c\u1EE7a Level 1 (VD: "1. Design & Coding", "2. Update Document & Sheet").
2. Value l\xE0 danh s\xE1ch c\xE1c subtask (Level 2).
3. M\u1ED7i subtask ph\u1EA3i c\xF3: \`subtask\`, \`start_date\`, \`end_date\` v\xE0 \`steps\` (Level 3).
4. \`start_date\`: M\u1EB7c \u0111\u1ECBnh l\xE0 ng\xE0y hi\u1EC7n t\u1EA1i (Format dd/mm/yyyy).
5. \`end_date\`: M\u1EB7c \u0111\u1ECBnh l\xE0 ng\xE0y h\xF4m sau (Format dd/mm/yyyy).
6. TUY\u1EC6T \u0110\u1ED0I KH\xD4NG ph\xE2n r\xE3 s\xE2u h\u01A1n Level 3 (KH\xD4NG \u0110\u01AF\u1EE2C C\xD3 1.1.1.1).
7. S\u1ED1 l\u01B0\u1EE3ng steps:
   - Task \u0111\u01A1n gi\u1EA3n: 3-5 b\u01B0\u1EDBc.
   - Task ph\u1EE9c t\u1EA1p: 5-10 (ho\u1EB7c h\u01A1n) b\u01B0\u1EDBc.
   - Ph\xE2n chia logic h\u1EE3p l\xFD \u0111\u1EC3 \u0111\u1EE7 chi ti\u1EBFt tri\u1EC3n khai.
   - S\u1ED1 l\u01B0\u1EE3ng steps gi\u1EEFa c\xE1c task ph\u1EA3i c\xF3 s\u1EF1 ch\xEAnh l\u1EC7ch h\u1EE3p l\xFD.
8. "2. Update Document & Sheet": steps ch\u1EE9a duy nh\u1EA5t 1 item tr\xF9ng n\u1ED9i dung v\u1EDBi subtask (c\xF3 \u0111\xE1nh s\u1ED1 Level 3).
9. N\u1ED9i dung steps: Ng\u1EAFn g\u1ECDn (5-20 t\u1EEB), s\xFAc t\xEDch.
10. \u01AFu ti\xEAn l\u1EA5y \`start_date\`, \`end_date\` t\u1EEB Prompt n\u1EBFu c\xF3.
11. JSON thu\u1EA7n, kh\xF4ng markdown.
`;

// src/gemini/index.ts
function fileToGenerativePart(base64Data, mimeType) {
  return {
    inlineData: {
      data: base64Data,
      mimeType
    }
  };
}
async function generateSheetJson(apiKey, tasks, files, images, modelName = "gemini-3-pro-preview") {
  if (!apiKey) throw new Error("API Key is missing");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json"
    }
  });
  let promptText = sheetPrompt + "\n\nINPUT DATA:\n";
  promptText += "DANH S\xC1CH TASK C\u1EA6N X\u1EEC L\xDD:\n";
  tasks.forEach((task) => {
    promptText += `- ID: ${task.id}
- EPIC: ${task.epic || ""}
- Task:
`;
    if (task.userStories && task.userStories.length > 0) {
      task.userStories.forEach((u, index) => {
        const timeInfo = u.startDate || u.endDate ? ` (Start: ${u.startDate}, End: ${u.endDate})` : "";
        promptText += `${u.content}${timeInfo}
`;
      });
    } else {
      promptText += `Empty user stories
`;
    }
    promptText += "\n";
  });
  let promptForLog = promptText + "\nCODE FILES included: " + files.map((f) => f.fileName).join(", ") + "\n";
  promptText += "\nCODE FILES:\n";
  files.forEach((file) => {
    promptText += `File: ${file.fileName}
Content:
${file.content}
---
`;
  });
  const parts = [{ text: promptText }];
  if (images && images.length > 0) {
    images.forEach((img) => {
      const base64Clean = img.base64.replace(/^data:image\/\w+;base64,/, "");
      parts.push(fileToGenerativePart(base64Clean, img.mimeType));
    });
  }
  const result = await model.generateContent(parts);
  const response = await result.response;
  const text = response.text();
  const cleanJson = text.replace(/```json\n|\n```/g, "").replace(/```/g, "").trim();
  return {
    data: JSON.parse(cleanJson),
    prompt: promptForLog
  };
}
async function validateGeminiApiKey(apiKey) {
  if (!apiKey) return false;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: "GET"
      }
    );
    return response.status === 200;
  } catch (error) {
    console.error("Error validating Gemini API Key:", error);
    return false;
  }
}

// src/extension.ts
var activeWebviews = /* @__PURE__ */ new Set();
var outputChannel = vscode2.window.createOutputChannel("Doc Generator");
var authManager;
async function executeWithTokenRefresh(fn, context) {
  const fullConfig = await getFullConfig(context);
  const accessToken = fullConfig.accessToken;
  if (!accessToken) {
    throw new Error("Ch\u01B0a \u0111\u0103ng nh\u1EADp");
  }
  try {
    return await fn(accessToken);
  } catch (err) {
    if (err.message?.includes("401") || err.message?.includes("Unauthorized")) {
      outputChannel.appendLine("[System] G\u1EB7p l\u1ED7i 401, \u0111ang refresh token...");
      const refreshedToken = await authManager.refreshToken();
      if (refreshedToken) {
        await broadcastConfig(context);
        return await fn(refreshedToken);
      }
    }
    throw err;
  }
}
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
            try {
              await executeWithTokenRefresh(async (token) => {
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
              }, context);
            } catch (err) {
              vscode2.window.showErrorMessage(`L\u1ED7i: ${err.message}`);
              panel.webview.postMessage({
                command: "generateResult",
                success: false
              });
            }
            break;
          case "generateSheetJson":
            outputChannel.show(true);
            try {
              await executeWithTokenRefresh(async (token) => {
                outputChannel.appendLine(
                  `[Gemini] --- B\u1EAFt \u0111\u1EA7u qu\xE1 tr\xECnh Generate JSON ---`
                );
                const config = await getFullConfig(context);
                if (!config.geminiApiKey) {
                  throw new Error("Vui l\xF2ng c\u1EA5u h\xECnh Gemini API Key tr\u01B0\u1EDBc.");
                }
                let tasksToProcess = [];
                if (data.selectedTaskId) {
                  const t = data.allTasks.find(
                    (x) => x.id === data.selectedTaskId
                  );
                  if (t) tasksToProcess.push(t);
                } else {
                  tasksToProcess = data.allTasks || [];
                }
                const { data: resultData, prompt: usedPrompt } = await generateSheetJson(
                  config.geminiApiKey,
                  tasksToProcess,
                  data.files,
                  data.images,
                  config.geminiModel
                );
                outputChannel.appendLine("[Gemini Prompt (Pre-Files)]:");
                outputChannel.appendLine(usedPrompt);
                outputChannel.appendLine("[Gemini Output]:");
                outputChannel.appendLine(JSON.stringify(resultData, null, 2));
                if (tasksToProcess.length > 0) {
                  const sheetManager = new SheetManager(outputChannel);
                  const mainTask = tasksToProcess[0];
                  await sheetManager.createDetailedSheet(
                    data.sheetId,
                    token,
                    mainTask,
                    resultData
                  );
                  vscode2.window.showInformationMessage(
                    `\u0110\xE3 t\u1EA1o sheet chi ti\u1EBFt cho task ${mainTask.id}`
                  );
                }
                panel.webview.postMessage({
                  command: "generateResult",
                  success: true,
                  data: resultData
                });
                vscode2.window.showInformationMessage(
                  "\u0110\xE3 t\u1EA1o JSON th\xE0nh c\xF4ng! Ki\u1EC3m tra Output."
                );
              }, context);
            } catch (err) {
              vscode2.window.showErrorMessage(`L\u1ED7i Gemini: ${err.message}`);
              outputChannel.appendLine(`[Error] ${err.message}`);
              panel.webview.postMessage({
                command: "generateResult",
                success: false,
                error: err.message
              });
            }
            break;
          case "checkSheetAccess":
            outputChannel.appendLine(
              `[Sheet] \u0110ang ki\u1EC3m tra quy\u1EC1n: ${data.sheetId}`
            );
            try {
              const result = await executeWithTokenRefresh(async (token) => {
                const sm = new SheetManager(outputChannel);
                return await sm.checkAccess(data.sheetId, token);
              }, context);
              panel.webview.postMessage({
                command: "checkSheetAccessResult",
                ...result
              });
            } catch (err) {
              panel.webview.postMessage({
                command: "checkSheetAccessResult",
                success: false,
                error: err.message === "Ch\u01B0a \u0111\u0103ng nh\u1EADp" ? err.message : "L\u1ED7i k\u1EBFt n\u1ED1i"
              });
            }
            break;
          case "getSheetData":
            outputChannel.appendLine(
              `[Sheet] \u0110ang l\u1EA5y d\u1EEF li\u1EC7u task t\u1EEB sheet: ${data.sheetId}`
            );
            try {
              const tasks = await executeWithTokenRefresh(async (token) => {
                const sm = new SheetManager(outputChannel);
                return await sm.getSheetData(
                  data.sheetId,
                  token,
                  data.sheetName
                );
              }, context);
              panel.webview.postMessage({
                command: "getSheetDataResult",
                success: true,
                tasks
              });
            } catch (err) {
              panel.webview.postMessage({
                command: "getSheetDataResult",
                success: false,
                error: err.message
              });
            }
            break;
          case "logTaskInfo":
            const task = data.task;
            if (task) {
              outputChannel.appendLine(`[Selected Task] ID: ${task.id}`);
              outputChannel.appendLine(`[Selected Task] EPIC: ${task.epic}`);
              outputChannel.appendLine(`[Selected Task] Details:`);
              if (task.userStories && Array.isArray(task.userStories)) {
                task.userStories.forEach((s) => {
                  outputChannel.appendLine(
                    `  - ${s.content} [${s.startDate} - ${s.endDate}]`
                  );
                });
              }
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
  setTimeout(async () => {
    outputChannel.appendLine("[System] Checking token status on startup...");
    await authManager.refreshToken();
  }, 5e3);
  const refreshInterval = setInterval(
    async () => {
      outputChannel.appendLine(
        "[System] Auto-refreshing token (30m interval)..."
      );
      await authManager.refreshToken();
    },
    30 * 60 * 1e3
  );
  context.subscriptions.push({
    dispose: () => clearInterval(refreshInterval)
  });
  context.subscriptions.push(
    vscode2.commands.registerCommand("doc-gen.testRefreshToken", async () => {
      outputChannel.show(true);
      outputChannel.appendLine("[Manual] Triggering token refresh test...");
      const newToken = await authManager.refreshToken();
      if (newToken) {
        vscode2.window.showInformationMessage(
          "Access Token \u0111\xE3 \u0111\u01B0\u1EE3c l\xE0m m\u1EDBi th\xE0nh c\xF4ng!"
        );
      } else {
        vscode2.window.showErrorMessage(
          "Kh\xF4ng th\u1EC3 l\xE0m m\u1EDBi token. Ki\u1EC3m tra Output \u0111\u1EC3 xem chi ti\u1EBFt."
        );
      }
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
        case "refreshToken":
          await this._authManager.refreshToken();
          break;
        case "validateApiKey":
          const isValid = await validateGeminiApiKey(data.apiKey);
          webviewView.webview.postMessage({
            command: "validateApiKeyResult",
            isValid
          });
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
/*! Bundled license information:

@google/generative-ai/dist/index.mjs:
@google/generative-ai/dist/index.mjs:
  (**
   * @license
   * Copyright 2024 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
*/
//# sourceMappingURL=extension.js.map
