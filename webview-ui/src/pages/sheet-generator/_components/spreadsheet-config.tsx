import { Input } from "@/components/ui/input";
import { Link2, RotateCw, X } from "lucide-react";

interface SpreadsheetConfigProps {
  sheetId: string;
  setSheetId: (id: string) => void;
  accessStatus: "idle" | "checking" | "success" | "error";
  sheetTitle: string;
  accessError: string;
}

export function SpreadsheetConfig({
  sheetId,
  setSheetId,
  accessStatus,
  sheetTitle,
  accessError,
}: SpreadsheetConfigProps) {
  return (
    <div className="space-y-4">
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
          <Link2 className="w-4 h-4" />
        </div>
        <Input
          placeholder="Dán Google Sheet ID vào đây..."
          value={sheetId}
          onChange={(e) => {
            const val = e.target.value;
            // Extract ID if a full URL is pasted
            const match = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
            if (match && match[1]) {
              setSheetId(match[1]);
            } else {
              setSheetId(val);
            }
          }}
          className="pl-10 h-11 bg-card/50 border-border/40 rounded-xl focus:ring-1 focus:ring-primary/30 transition-all"
        />
      </div>

      {accessStatus !== "idle" && (
        <div className="px-1 -mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
          {accessStatus === "checking" && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <RotateCw className="w-3 h-3 animate-spin" />
              Đang kiểm tra quyền truy cập...
            </div>
          )}
          {accessStatus === "success" && (
            <div className="flex items-center gap-2 text-[11px] text-green-500 font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Đã kết nối:{" "}
              <span className="underline decoration-green-500/30">
                {sheetTitle}
              </span>
            </div>
          )}
          {accessStatus === "error" && (
            <div className="flex items-center gap-2 text-[11px] text-red-500 font-medium">
              <X className="w-3 h-3" />
              {accessError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
