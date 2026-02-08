import { Input } from "@/components/ui/input";
import { Link2, RotateCw, X, FolderKanban } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskData {
  id: string;
  epic: string;
  userStories: {
    content: string;
    startDate: string;
    endDate: string;
  }[];
}

interface SpreadsheetConfigProps {
  sheetId: string;
  setSheetId: (id: string) => void;
  accessStatus: "idle" | "checking" | "success" | "error";
  sheetTitle: string;
  accessError: string;
  tasks?: TaskData[];
  selectedTaskId?: string;
  onTaskChange?: (taskId: string) => void;
}

export function SpreadsheetConfig({
  sheetId,
  setSheetId,
  accessStatus,
  sheetTitle,
  accessError,
  tasks = [],
  selectedTaskId,
  onTaskChange,
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
        <div className="space-y-3 px-1 -mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between">
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

          {
            /* Task Selector */
            accessStatus === "success" && tasks.length > 0 && (
              <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-xs font-medium text-muted-foreground ml-1 flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5" />
                  Chọn Task (EPIC)
                </label>
                <Select
                  value={selectedTaskId}
                  onValueChange={(val) => onTaskChange?.(val)}
                >
                  <SelectTrigger className="w-full h-10 bg-card/50 border-border/40 rounded-lg focus:ring-1 focus:ring-primary/30">
                    <SelectValue placeholder="Chọn một task..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        <span className="font-medium mr-2">{task.epic}</span>
                        <span className="text-muted-foreground text-xs">
                          {task.id}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          }
        </div>
      )}
    </div>
  );
}
