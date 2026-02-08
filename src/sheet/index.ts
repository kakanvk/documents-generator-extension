import * as vscode from "vscode";

export interface SheetRecord {
  no: number;
  fileName: string;
  time: string;
}

export interface TaskData {
  id: string;
  epic: string;
  userStories: {
    content: string;
    startDate: string;
    endDate: string;
  }[];
}

export class SheetManager {
  constructor(private outputChannel: vscode.OutputChannel) {}

  /**
   * Thêm các bản ghi vào Google Sheet SRINPT
   */
  public async addRecordsToSheet(
    spreadsheetId: string,
    accessToken: string,
    records: SheetRecord[],
  ) {
    const range = "SRINPT!A:C";
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW`;

    const values = records.map((r) => [r.no.toString(), r.fileName, r.time]);

    try {
      this.outputChannel.appendLine(
        `[Sheet] Đang gửi yêu cầu append tới Sheet ID: ${spreadsheetId}`,
      );

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: values,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.outputChannel.appendLine(`[Sheet] Lỗi API: ${errorText}`);

        if (response.status === 401) {
          throw new Error("401-Unauthorized");
        }

        throw new Error(`Google Sheets API error: ${response.statusText}`);
      }

      this.outputChannel.appendLine(
        `[Sheet] Đã thêm ${records.length} bản ghi thành công.`,
      );
      return true;
    } catch (error) {
      this.outputChannel.appendLine(`[Sheet] Lỗi khi thêm bản ghi: ${error}`);
      throw error;
    }
  }

  /**
   * Đảm bảo sheet SRINPT tồn tại và có Header (nếu cần)
   */
  public async ensureSheetExists(spreadsheetId: string, accessToken: string) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("401-Unauthorized");
      }
      return false;
    }

    const data: any = await response.json();
    const hasSheet = data.sheets?.some(
      (s: any) => s.properties?.title === "SRINPT",
    );

    if (!hasSheet) {
      this.outputChannel.appendLine(
        `[Sheet] Không tìm thấy sheet 'SRINPT'. Đang tạo mới...`,
      );
      await this.createSheet(spreadsheetId, accessToken, "SRINPT");
      await this.addHeader(spreadsheetId, accessToken, "SRINPT");
    }
    return true;
  }

  private async createSheet(
    spreadsheetId: string,
    accessToken: string,
    title: string,
  ) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: { title },
            },
          },
        ],
      }),
    });
  }

  private async addHeader(
    spreadsheetId: string,
    accessToken: string,
    title: string,
  ) {
    const range = `${title}!A1:C1`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
    await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [["No.", "File name", "Time"]],
      }),
    });
  }

  /**
   * Kiểm tra quyền truy cập vào Spreadsheet
   */
  public async checkAccess(spreadsheetId: string, accessToken: string) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties(title)`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.outputChannel.appendLine(
        `[Sheet] CheckAccess thất bại. Status: ${response.status}`,
      );
      this.outputChannel.appendLine(`[Sheet] Chi tiết lỗi: ${errorText}`);

      if (response.status === 401) {
        throw new Error("401-Unauthorized");
      }

      if (response.status === 403) {
        return {
          success: false,
          error: "Forbidden: API chưa bật hoặc không có quyền ghi.",
        };
      }

      return { success: false, error: "Không tìm thấy Sheet hoặc ID sai." };
    }

    const data: any = await response.json();
    return { success: true, title: data.properties?.title || "Untitled" };
  }

  /**
   * Lấy dữ liệu từ sheet (ID, EPIC, USER STORY)
   */
  public async getSheetData(
    spreadsheetId: string,
    accessToken: string,
    sheetName?: string,
  ): Promise<TaskData[]> {
    try {
      let range = sheetName ? `${sheetName}!B:F` : "B:F";
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

      this.outputChannel.appendLine(
        `[Sheet] Đang đọc dữ liệu từ Sheet ID: ${spreadsheetId}, Range: ${range}`,
      );

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.outputChannel.appendLine(`[Sheet] Lỗi API: ${errorText}`);

        if (response.status === 401) {
          throw new Error("401-Unauthorized");
        }

        throw new Error(`Google Sheets API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      const values = data.values || [];

      const tasks: TaskData[] = [];
      let currentTask: TaskData | null = null;

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
            userStories: [],
          };
          tasks.push(currentTask);
        }

        if (currentTask && userStory) {
          currentTask.userStories.push({
            content: userStory,
            startDate,
            endDate,
          });
        }
      }

      this.outputChannel.appendLine(
        `[Sheet] Đã đọc ${tasks.length} task chính từ sheet`,
      );
      return tasks;
    } catch (error) {
      this.outputChannel.appendLine(`[Sheet] Lỗi khi đọc dữ liệu: ${error}`);
      throw error;
    }
  }

  /**
   * Tạo sheet chi tiết dựa trên template và dữ liệu từ Gemini
   */
  public async createDetailedSheet(
    spreadsheetId: string,
    accessToken: string,
    task: TaskData,
    geminiData: any, // GeminiResponse
  ) {
    const sheetName = `${task.id}.Details`;

    try {
      this.outputChannel.appendLine(
        `[Sheet] Bắt đầu tạo sheet chi tiết: ${sheetName}`,
      );

      const spreadsheet = (await this.getSpreadsheet(
        spreadsheetId,
        accessToken,
      )) as any;
      const sheets = spreadsheet.sheets || [];
      const templateSheet = sheets.find(
        (s: any) => s.properties?.title === "Template",
      );
      const existingSheet = sheets.find(
        (s: any) => s.properties?.title === sheetName,
      );

      if (!templateSheet) {
        throw new Error("Không tìm thấy sheet 'Template' để làm mẫu.");
      }

      const templateSheetId = templateSheet.properties.sheetId;
      const requests: any[] = [];

      if (existingSheet) {
        requests.push({
          deleteSheet: { sheetId: existingSheet.properties.sheetId },
        });
      }

      requests.push({
        duplicateSheet: {
          sourceSheetId: templateSheetId,
          newSheetName: sheetName,
          insertSheetIndex: sheets.length,
        },
      });

      const batchResponse = (await this.batchUpdate(
        spreadsheetId,
        accessToken,
        requests,
      )) as any;
      const newSheetId = batchResponse.replies.find(
        (r: any) => r.duplicateSheet,
      ).duplicateSheet.properties.sheetId;

      // 4. Để hàm reorderSheets xử lý sắp xếp sau khi hoàn tất các update nội dung
      // (Xóa bỏ logic tính toán reorderRequests ở đây để tránh dư thừa)

      // 5. Chuẩn bị dữ liệu ghi vào sheet
      const rows: string[][] = [];
      const mergeRequests: any[] = [];
      let currentRowIndex = 2; // Bắt đầu từ dòng 3 (index 2)

      for (const [category, subtasks] of Object.entries(geminiData)) {
        // Category row
        const catRowIndex = currentRowIndex;
        const catRow = new Array(12).fill("");
        catRow[3] = category; // D: TASKS (Level 1)
        catRow[6] = "PASSED"; // G
        catRow[8] = "LOW"; // I
        catRow[9] = "SIMPLE"; // J
        rows.push(catRow);
        currentRowIndex++;

        // Merge B to F cho dòng Category và set IN ĐẬM + MÀU NỀN
        mergeRequests.push({
          mergeCells: {
            range: {
              sheetId: newSheetId,
              startRowIndex: catRowIndex,
              endRowIndex: catRowIndex + 1,
              startColumnIndex: 1, // B
              endColumnIndex: 6, // F
            },
            mergeType: "MERGE_ALL",
          },
        });
        mergeRequests.push({
          repeatCell: {
            range: {
              sheetId: newSheetId,
              startRowIndex: catRowIndex,
              endRowIndex: catRowIndex + 1,
              startColumnIndex: 1, // B
              endColumnIndex: 6, // F
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 182 / 255,
                  green: 215 / 255,
                  blue: 168 / 255,
                },
                textFormat: { bold: true },
                horizontalAlignment: "CENTER",
                verticalAlignment: "MIDDLE",
              },
            },
            fields:
              "userEnteredFormat(backgroundColor,textFormat(bold),horizontalAlignment,verticalAlignment)",
          },
        });

        if (Array.isArray(subtasks)) {
          for (const st of subtasks as any[]) {
            const steps = Array.isArray(st.steps) ? st.steps : [];
            const numSteps = steps.length || 1;
            const subtaskStartRow = currentRowIndex;

            for (let i = 0; i < numSteps; i++) {
              const stepRow = new Array(12).fill("");
              if (i === 0) {
                stepRow[1] = st.start_date || ""; // B
                stepRow[2] = st.end_date || ""; // C
                stepRow[3] = st.subtask || ""; // D
              }
              stepRow[4] = steps[i] || ""; // E: Steps
              stepRow[6] = "PASSED"; // G
              stepRow[8] = "LOW"; // I
              stepRow[9] = "SIMPLE"; // J
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
                      endColumnIndex: colIndex + 1,
                    },
                    mergeType: "MERGE_ALL",
                  },
                });
                mergeRequests.push({
                  repeatCell: {
                    range: {
                      sheetId: newSheetId,
                      startRowIndex: subtaskStartRow,
                      endRowIndex: subtaskStartRow + numSteps,
                      startColumnIndex: colIndex,
                      endColumnIndex: colIndex + 1,
                    },
                    cell: {
                      userEnteredFormat: {
                        verticalAlignment: "MIDDLE",
                        horizontalAlignment: colIndex === 3 ? "LEFT" : "CENTER",
                      },
                    },
                    fields:
                      "userEnteredFormat(verticalAlignment,horizontalAlignment)",
                  },
                });
              });
            }
          }
        }
      }

      // Ghi dữ liệu văn bản
      const range = `${sheetName}!A3:L${currentRowIndex}`;
      await this.updateValues(spreadsheetId, accessToken, range, rows);

      const finalRequests: any[] = [
        ...mergeRequests,
        // Xuống dòng tự động cho toàn bộ bảng
        {
          repeatCell: {
            range: {
              sheetId: newSheetId,
              startRowIndex: 2,
              endRowIndex: 2 + rows.length,
              startColumnIndex: 0,
              endColumnIndex: 12,
            },
            cell: {
              userEnteredFormat: {
                wrapStrategy: "WRAP",
                verticalAlignment: "MIDDLE",
              },
            },
            fields: "userEnteredFormat(wrapStrategy,verticalAlignment)",
          },
        },
        // Vẽ border màu #674ea7 cho toàn bộ bảng
        {
          updateBorders: {
            range: {
              sheetId: newSheetId,
              startRowIndex: 2,
              endRowIndex: 2 + rows.length,
              startColumnIndex: 0,
              endColumnIndex: 12,
            },
            top: {
              style: "SOLID",
              color: { red: 103 / 255, green: 78 / 255, blue: 167 / 255 },
            },
            bottom: {
              style: "SOLID",
              color: { red: 103 / 255, green: 78 / 255, blue: 167 / 255 },
            },
            left: {
              style: "SOLID",
              color: { red: 103 / 255, green: 78 / 255, blue: 167 / 255 },
            },
            right: {
              style: "SOLID",
              color: { red: 103 / 255, green: 78 / 255, blue: 167 / 255 },
            },
            innerHorizontal: {
              style: "SOLID",
              color: { red: 103 / 255, green: 78 / 255, blue: 167 / 255 },
            },
            innerVertical: {
              style: "SOLID",
              color: { red: 103 / 255, green: 78 / 255, blue: 167 / 255 },
            },
          },
        },
        // Copy format G, I, J
        {
          copyPaste: {
            source: {
              sheetId: newSheetId,
              startRowIndex: 2,
              endRowIndex: 3,
              startColumnIndex: 6,
              endColumnIndex: 7,
            },
            destination: {
              sheetId: newSheetId,
              startRowIndex: 3,
              endRowIndex: 2 + rows.length,
              startColumnIndex: 6,
              endColumnIndex: 7,
            },
            pasteType: "PASTE_NORMAL",
          },
        },
        {
          copyPaste: {
            source: {
              sheetId: newSheetId,
              startRowIndex: 2,
              endRowIndex: 3,
              startColumnIndex: 8,
              endColumnIndex: 9,
            },
            destination: {
              sheetId: newSheetId,
              startRowIndex: 3,
              endRowIndex: 2 + rows.length,
              startColumnIndex: 8,
              endColumnIndex: 9,
            },
            pasteType: "PASTE_NORMAL",
          },
        },
        {
          copyPaste: {
            source: {
              sheetId: newSheetId,
              startRowIndex: 2,
              endRowIndex: 3,
              startColumnIndex: 9,
              endColumnIndex: 10,
            },
            destination: {
              sheetId: newSheetId,
              startRowIndex: 3,
              endRowIndex: 2 + rows.length,
              startColumnIndex: 9,
              endColumnIndex: 10,
            },
            pasteType: "PASTE_NORMAL",
          },
        },
        {
          updateCells: {
            range: {
              sheetId: newSheetId,
              startRowIndex: 2,
              endRowIndex: 2 + rows.length,
              startColumnIndex: 0,
              endColumnIndex: 1,
            },
            rows: [
              {
                values: [
                  {
                    userEnteredValue: { stringValue: task.id },
                    userEnteredFormat: {
                      verticalAlignment: "MIDDLE",
                      horizontalAlignment: "LEFT",
                    },
                  },
                ],
              },
            ],
            fields:
              "userEnteredValue,userEnteredFormat(verticalAlignment,horizontalAlignment)",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: newSheetId,
              startRowIndex: 2,
              endRowIndex: 2 + rows.length,
              startColumnIndex: 0,
              endColumnIndex: 1,
            },
            mergeType: "MERGE_ALL",
          },
        },
      ];

      await this.batchUpdate(spreadsheetId, accessToken, finalRequests);

      // 7. Thực hiện sắp xếp lại các sheet (SRINPT lên đầu)
      await this.reorderSheets(spreadsheetId, accessToken);

      this.outputChannel.appendLine(
        `[Sheet] Đã tạo và đổ dữ liệu vào sheet '${sheetName}' thành công.`,
      );
      return sheetName;
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[Sheet] Lỗi khi tạo sheet chi tiết: ${error.message}`,
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
  public async reorderSheets(spreadsheetId: string, accessToken: string) {
    try {
      this.outputChannel.appendLine(
        "[Sheet] Đang tự động sắp xếp lại thứ tự các sheet...",
      );
      const spreadsheet = (await this.getSpreadsheet(
        spreadsheetId,
        accessToken,
      )) as any;
      const allSheets = spreadsheet.sheets || [];

      // Phân loại các nhóm sheet
      const srinptSheet = allSheets.find(
        (s: any) =>
          s.properties?.title === "SRINPT" || s.properties?.title === "SPRINT",
      );
      const detailsSheets = allSheets.filter((s: any) =>
        s.properties?.title?.endsWith(".Details"),
      );
      const otherSheets = allSheets.filter(
        (s: any) =>
          s.properties?.title !== "SRINPT" &&
          s.properties?.title !== "SPRINT" &&
          !s.properties?.title?.endsWith(".Details"),
      );

      // Sắp xếp các sheet Details giảm dần theo ID (số lớn hơn về bên trái)
      detailsSheets.sort((a: any, b: any) =>
        b.properties.title.localeCompare(a.properties.title, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );

      // Hợp nhất danh sách theo thứ tự mong muốn: [SRINPT, ...Details, ...Others]
      const sortedList: any[] = [];
      if (srinptSheet) {
        sortedList.push(srinptSheet);
      }
      sortedList.push(...detailsSheets);
      sortedList.push(...otherSheets);

      // Tạo các request cập nhật index
      const requests = sortedList.map((s, idx) => ({
        updateSheetProperties: {
          properties: {
            sheetId: s.properties.sheetId,
            index: idx,
          },
          fields: "index",
        },
      }));

      if (requests.length > 0) {
        await this.batchUpdate(spreadsheetId, accessToken, requests);
      }
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[Sheet] Không thể sắp xếp sheet: ${error.message}`,
      );
    }
  }

  private async getSpreadsheet(spreadsheetId: string, accessToken: string) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error(
        `Lưu ý: Không thể lấy thông tin Spreadsheet (${response.status})`,
      );
    }
    return await response.json();
  }

  private async batchUpdate(
    spreadsheetId: string,
    accessToken: string,
    requests: any[],
  ) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Sheets batchUpdate error: ${errorText}`);
    }

    return await response.json();
  }

  private async updateValues(
    spreadsheetId: string,
    accessToken: string,
    range: string,
    values: string[][],
  ) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range,
    )}?valueInputOption=USER_ENTERED`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Sheets updateValues error: ${errorText}`);
    }
  }
}
