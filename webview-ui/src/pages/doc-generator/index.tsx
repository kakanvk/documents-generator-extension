import { Button } from "@/components/ui/button";
import React, { useState, useEffect } from "react";
import { vscode } from "@/lib/vscode";

interface FileData {
  fileName: string;
  content: string;
}

export default function DocGenerator() {
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<string[]>([]);
  const [fileContents, setFileContents] = useState<FileData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === "fileContentsResult") {
        setFileContents(message.contents);
        setIsLoading(false);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files: string[] = [];

    // Lấy tất cả URI (Hỗ trợ nhiều file)
    const uriList = e.dataTransfer.getData("text/uri-list");
    if (uriList) {
      files.push(
        ...uriList
          .split("\n")
          .filter((u) => u.trim() !== "" && !u.startsWith("#")),
      );
    }

    const explorerData = e.dataTransfer.getData(
      "application/vnd.code.tree.explorerItem",
    );
    if (explorerData) {
      try {
        const items = JSON.parse(explorerData);
        if (Array.isArray(items)) {
          items.forEach((item) => {
            if (item.uri) files.push(item.uri);
          });
        }
      } catch (err) {}
    }

    if (files.length > 0) {
      const uniqueFiles = Array.from(new Set(files));
      // Cho phép cộng dồn files
      setDroppedFiles((prev) => Array.from(new Set([...prev, ...uniqueFiles])));

      vscode.postMessage({
        command: "filesDropped",
        files: uniqueFiles,
      });
    }
  };

  const handleGenerate = () => {
    if (droppedFiles.length === 0) return;
    setIsLoading(true);
    vscode.postMessage({
      command: "readFilesContent",
      files: droppedFiles,
    });
  };

  return (
    <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto h-full overflow-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Doc Generator</h1>
        <p className="text-muted-foreground">
          Tạo và quản lý các tài liệu mẫu của bạn tại đây.
        </p>
      </div>

      <div
        className={`grid gap-4 p-6 border rounded-xl bg-card shadow-sm transition-all duration-200 ${
          isDragging ? "border-primary border-2 bg-primary/5 scale-[1.01]" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <h2 className="text-xl font-semibold">Cấu hình tài liệu</h2>

        <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground gap-2">
          {droppedFiles.length > 0 ? (
            <div className="w-full px-4 text-sm overflow-hidden text-left">
              <p className="font-medium text-foreground mb-2 italic underline">
                Các file đã chọn ({droppedFiles.length}):
              </p>
              <ul className="list-disc list-inside space-y-1 max-h-24 overflow-y-auto">
                {droppedFiles.map((f, i) => (
                  <li key={i} className="truncate text-xs" title={f}>
                    {decodeURIComponent(f.split("/").pop() || "")}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <p className="font-medium">
                Kéo thả danh sách file từ Explorer vào đây
              </p>
              <p className="text-xs text-muted-foreground">
                (Hỗ trợ các file/folder trực tiếp từ tab Explorer của VS Code)
              </p>
            </>
          )}
        </div>

        <div className="flex justify-between items-center mt-2">
          <Button
            className="w-fit"
            disabled={droppedFiles.length === 0 || isLoading}
            onClick={handleGenerate}
          >
            {isLoading ? "Đang xử lý..." : "Bắt đầu tạo Doc"}
          </Button>
          {droppedFiles.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDroppedFiles([]);
                setFileContents([]);
              }}
            >
              Xóa tất cả
            </Button>
          )}
        </div>
      </div>

      {/* Hiển thị nội dung file */}
      {fileContents.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-lg font-semibold border-b pb-2">
            Nội dung đã đọc:
          </h3>
          <div className="grid gap-4 pb-10">
            {fileContents.map((file, index) => (
              <div key={index} className="border rounded-lg bg-muted/30 p-4">
                <p className="font-mono text-xs font-bold mb-2 text-primary">
                  📄 {file.fileName}
                </p>
                <pre className="text-xs bg-black/20 p-3 rounded max-h-60 overflow-auto whitespace-pre-wrap font-mono text-slate-300">
                  {file.content}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
