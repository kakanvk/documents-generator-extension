import { FileSpreadsheet, FileCode, FileText, Folder } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { vscode } from "@/lib/vscode";
import { SpreadsheetConfig } from "./_components/spreadsheet-config";
import { FileManagement } from "./_components/file-management";

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

export default function SheetGenerator() {
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<string[]>([]);
  const [fileContents, setFileContents] = useState<FileData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sheetId, setSheetId] = useState("");

  // States for confirmation dialog
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const dragCounter = useRef(0);

  // States for Sheet Access Check
  const [accessStatus, setAccessStatus] = useState<
    "idle" | "checking" | "success" | "error"
  >("idle");
  const [accessError, setAccessError] = useState("");
  const [sheetTitle, setSheetTitle] = useState("");

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === "fileContentsResult") {
        setFileContents((prev) => {
          // Merge results based on URI
          const newMap = new Map(prev.map((f) => [f.uri, f]));
          message.contents.forEach((item: FileData) => {
            newMap.set(item.uri, item);
          });
          return Array.from(newMap.values());
        });
        setIsLoading(false);
      }
      if (message.command === "generateResult") {
        setIsLoading(false);
      }
      if (message.command === "checkSheetAccessResult") {
        if (message.success) {
          setAccessStatus("success");
          setSheetTitle(message.title);
        } else {
          setAccessStatus("error");
          setAccessError(message.error);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Debounce check access khi nhập sheetId
  useEffect(() => {
    if (!sheetId || sheetId.length < 10) {
      setAccessStatus("idle");
      return;
    }

    const timer = setTimeout(() => {
      setAccessStatus("checking");
      vscode.postMessage({ command: "checkSheetAccess", sheetId });
    }, 800);

    return () => clearTimeout(timer);
  }, [sheetId]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files: string[] = [];
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
      setDroppedFiles((prev) => Array.from(new Set([...prev, ...uniqueFiles])));
      vscode.postMessage({ command: "readFilesContent", files: uniqueFiles });
    }
  };

  const removeFile = (uri: string) => {
    setDroppedFiles((prev) => prev.filter((f) => f !== uri));
    setFileContents((prev) => prev.filter((f) => f.uri !== uri));
  };

  const triggerClearAll = () => {
    setIsConfirmOpen(true);
  };

  const handleConfirmClearAll = () => {
    setDroppedFiles([]);
    setFileContents([]);
    setIsConfirmOpen(false);
  };

  const handleGenerate = () => {
    if (droppedFiles.length === 0 || !sheetId) return;
    setIsLoading(true);

    // Flatten all files from folders
    const allFileNames: { fileName: string }[] = [];
    fileContents.forEach((item) => {
      if (item.isDirectory && item.files) {
        item.files.forEach((f) => {
          allFileNames.push({ fileName: f.fileName });
        });
      } else {
        allFileNames.push({ fileName: item.fileName });
      }
    });

    vscode.postMessage({
      command: "generateSheet",
      sheetId,
      files: allFileNames,
    });
  };

  const getFileIcon = (fileName: string, isDirectory?: boolean) => {
    if (isDirectory) return <Folder className="w-4 h-4 text-amber-500" />;
    if (fileName.endsWith(".json"))
      return <FileCode className="w-4 h-4 text-yellow-500" />;
    if (fileName.endsWith(".csv"))
      return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
    return <FileText className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto h-full overflow-auto custom-scrollbar animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex items-center gap-2 px-1">
        <FileSpreadsheet className="w-5 h-5 text-green-500" />
        <h1 className="text-xl font-bold tracking-tight">Sheet Generator</h1>
      </div>

      <SpreadsheetConfig
        sheetId={sheetId}
        setSheetId={setSheetId}
        accessStatus={accessStatus}
        sheetTitle={sheetTitle}
        accessError={accessError}
      />

      <FileManagement
        isDragging={isDragging}
        droppedFiles={droppedFiles}
        fileContents={fileContents}
        isLoading={isLoading}
        sheetId={sheetId}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onRemoveFile={removeFile}
        triggerClearAll={triggerClearAll}
        onGenerate={handleGenerate}
        getFileIcon={getFileIcon}
        isConfirmOpen={isConfirmOpen}
        setIsConfirmOpen={setIsConfirmOpen}
        handleConfirmClearAll={handleConfirmClearAll}
      />
    </div>
  );
}
