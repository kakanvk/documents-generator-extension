import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UploadCloud,
  X,
  Play,
  RotateCw,
  Eye,
  ChevronDown,
  ChevronRight,
  FileJson,
  FileText,
  FileSpreadsheet,
  Folder,
} from "lucide-react";
import React, { useState } from "react";

interface FileItem {
  fileName: string;
  content: string;
}

interface FileData {
  uri: string;
  fileName: string;
  isDirectory: boolean;
  fileCount?: number;
  content?: string;
  files?: FileItem[];
}

interface FileManagementProps {
  isDragging: boolean;
  droppedFiles: string[];
  fileContents: FileData[];
  isLoading: boolean;
  sheetId: string;
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onRemoveFile: (uri: string) => void;
  triggerClearAll: () => void;
  onGenerate: () => void;
  getFileIcon: (fileName: string, isDirectory?: boolean) => React.ReactNode;
  isConfirmOpen: boolean;
  setIsConfirmOpen: (open: boolean) => void;
  handleConfirmClearAll: () => void;
}

export function FileManagement({
  isDragging,
  droppedFiles,
  fileContents,
  isLoading,
  sheetId,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemoveFile,
  triggerClearAll,
  onGenerate,
  getFileIcon,
  isConfirmOpen,
  setIsConfirmOpen,
  handleConfirmClearAll,
}: FileManagementProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <>
      {/* Main Drop Area */}
      <div
        className={`relative flex flex-col p-6 border-2 border-dashed rounded-2xl transition-all duration-200 overflow-hidden ${
          isDragging
            ? "border-primary bg-primary/10 ring-4 ring-primary/5 scale-[0.98] shadow-2xl shadow-primary/20"
            : "border-border/60 bg-card/40 backdrop-blur-md hover:bg-card/60 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 shadow-inner shadow-white/5"
        } ${droppedFiles.length === 0 ? "h-64" : "min-h-[140px]"}`}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        {droppedFiles.length === 0 && !isDragging && (
          <div className="relative flex-1 flex flex-col items-center justify-center text-center space-y-4 pointer-events-none group-hover:scale-105 transition-transform duration-200">
            <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10 shadow-lg group-hover:bg-primary/10 transition-colors">
              <UploadCloud className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold tracking-tight">
                Kéo thả file/thư mục vào đây
              </p>
              <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
                Hỗ trợ JSON, CSV và thư mục chứa các file dữ liệu.
              </p>
            </div>
          </div>
        )}

        {isDragging && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-primary/10 backdrop-blur-[3px] rounded-2xl pointer-events-none animate-in fade-in duration-150">
            <div className="flex flex-col items-center gap-4">
              <div className="p-6 rounded-full bg-primary shadow-2xl shadow-primary/40 text-primary-foreground">
                <UploadCloud className="w-10 h-10" />
              </div>
            </div>
          </div>
        )}

        {droppedFiles.length > 0 && (
          <div
            className={`relative space-y-2 py-1 transition-all duration-300 ${isDragging ? "opacity-20 blur-[2px] scale-[0.98]" : ""}`}
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Danh sách ({droppedFiles.length} mục)
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  onClick={() => setIsPreviewOpen(true)}
                  className="cursor-pointer text-[10px] text-muted-foreground hover:text-primary transition-colors h-7 px-2"
                >
                  <Eye className="w-3 h-3 mr-1" /> Preview
                </Button>
                <Button
                  variant="ghost"
                  onClick={triggerClearAll}
                  className="cursor-pointer text-[10px] text-muted-foreground hover:text-red-500 transition-colors h-7 px-2"
                >
                  Xóa tất cả
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {fileContents.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2.5 pl-3 rounded-xl border border-border/50 bg-card shadow-sm group/file hover:border-primary/40 transition-all animate-in zoom-in-95 duration-200"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getFileIcon(item.fileName, item.isDirectory)}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] truncate font-medium max-w-[150px]">
                        {item.fileName}
                      </span>
                      {item.isDirectory && (
                        <span className="text-[9px] text-muted-foreground">
                          Thư mục ({item.fileCount} files)
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => onRemoveFile(item.uri)}
                    size="icon"
                    className="size-6 cursor-pointer hover:bg-red-500/10 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="mt-auto pt-6 pb-4 flex justify-center">
        <Button
          className="h-12 px-10 bg-primary hover:bg-primary/90 group shadow-xl shadow-primary/20 rounded-2xl transition-all"
          disabled={droppedFiles.length === 0 || isLoading || !sheetId}
          onClick={onGenerate}
        >
          {isLoading ? (
            <RotateCw className="w-5 h-5 animate-spin" />
          ) : (
            <div className="flex items-center gap-3">
              <span className="font-bold tracking-tight text-sm">
                BẮT ĐẦU TẠO SHEET
              </span>
              <Play className="w-4 h-4 fill-current group-hover:translate-x-1 transition-transform" />
            </div>
          )}
        </Button>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[80vw] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Xem trước dữ liệu trích xuất
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto max-h-[50vh]">
            {fileContents.map((item) => {
              if (item.isDirectory) {
                return (
                  <div key={item.uri} className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest bg-muted/30 px-3 py-1.5 rounded-lg">
                      <Folder className="w-3 h-3 text-amber-500" />
                      {item.fileName} ({item.fileCount} file)
                    </div>
                    <div className="space-y-2 pl-2 border-l border-border/40 ml-2">
                      {item.files?.map((subFile, idx) => (
                        <FileViewer
                          key={`${item.uri}-${subFile.fileName}-${idx}`}
                          fileName={subFile.fileName}
                          content={subFile.content}
                        />
                      ))}
                    </div>
                  </div>
                );
              }
              return (
                <FileViewer
                  key={item.uri}
                  fileName={item.fileName}
                  content={item.content || ""}
                />
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPreviewOpen(false)}
              className="rounded-xl"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa tất cả</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa toàn bộ danh sách đã chọn không?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsConfirmOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleConfirmClearAll}>
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getPreviewIcon(fileName: string) {
  if (fileName.endsWith(".json"))
    return <FileJson className="w-4 h-4 text-yellow-500" />;
  if (fileName.endsWith(".csv"))
    return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
  return <FileText className="w-4 h-4 text-blue-500" />;
}

function FileViewer({
  fileName,
  content,
}: {
  fileName: string;
  content: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border/30 bg-card/40 overflow-hidden transition-all hover:border-primary/20">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {getPreviewIcon(fileName)}
          <span className="text-[11px] font-medium font-mono">{fileName}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      {isExpanded &&
        (content ? (
          <pre className="p-4 pt-1 text-[10px] overflow-auto font-mono opacity-80 bg-muted/10 animate-in slide-in-from-top-1 duration-200">
            {content}
          </pre>
        ) : (
          <div className="p-4 pt-1 text-[10px] overflow-auto font-mono opacity-80 bg-muted/10 animate-in slide-in-from-top-1 duration-200">
            <span className="text-muted-foreground italic select-none">
              (File trống)
            </span>
          </div>
        ))}
    </div>
  );
}
