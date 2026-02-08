import * as vscode from "vscode";

export interface SheetRecord {
  no: number;
  fileName: string;
  time: string;
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
   * Lưu ý: Hiện tại đơn giản là append, nếu SRINPT chưa có thì API có thể báo lỗi 400
   */
  public async ensureSheetExists(spreadsheetId: string, accessToken: string) {
    // Để đơn giản, ta có thể gọi get spreadsheet để check sheets
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) return false;

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
    } catch (e) {
      return false;
    }
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
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${title}!A1:C1?valueInputOption=RAW`;
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
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        const errorText = await response.text();
        this.outputChannel.appendLine(
          `[Sheet] CheckAccess thất bại. Status: ${response.status}`,
        );
        this.outputChannel.appendLine(`[Sheet] Chi tiết lỗi: ${errorText}`);

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
    } catch (e) {
      return { success: false, error: "Lỗi kết nối khi kiểm tra quyền." };
    }
  }
}
