import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { vscode } from "@/lib/vscode";
import {
  FileSpreadsheet,
  FileText,
  Key,
  User,
  Sparkles,
  LogOut,
  CheckCircle2,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  RotateCw,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function MainSidebar() {
  const [apiKey, setApiKey] = useState("");
  const [tempApiKey, setTempApiKey] = useState("");
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [user, setUser] = useState<{
    name?: string;
    email?: string;
    picture?: string;
  } | null>(null);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (vscode) {
      vscode.postMessage({ command: "getConfig" });
    }

    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === "loadConfig" && message.data) {
        if (message.data.geminiApiKey !== undefined) {
          setApiKey(message.data.geminiApiKey);
        }
        if (message.data.isLoggedIn !== undefined) {
          setIsLoggedIn(message.data.isLoggedIn);
        }
        if (message.data.user !== undefined) {
          setUser(message.data.user);
        }

        // Chỉ tắt loading ngay lập tức nếu là lần đầu tiên mở extension
        if (initialLoadRef.current) {
          setIsLoading(false);
          initialLoadRef.current = false;
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleLogin = () => {
    if (vscode) {
      vscode.postMessage({ command: "login-google" });
    }
  };

  const handleLogout = () => {
    if (vscode) {
      vscode.postMessage({ command: "logout" });
    }
  };

  const handleReload = () => {
    if (vscode && !isReloading) {
      setIsReloading(true);
      setIsLoading(true); // Hiển thị Skeleton
      vscode.postMessage({ command: "getConfig" });

      // Giữ Skeleton hiển thị ít nhất 1s để tạo hiệu ứng mượt mà
      setTimeout(() => {
        setIsReloading(false);
        setIsLoading(false);
      }, 1000);
    }
  };

  const navigateToSheet = () => {
    if (vscode) {
      vscode.postMessage({ command: "navigate", path: "/sheet-gen" });
    }
  };

  const navigateToDocs = () => {
    if (vscode) {
      vscode.postMessage({ command: "navigate", path: "/docs-gen" });
    }
  };

  const startEditing = () => {
    setTempApiKey(apiKey);
    setIsEditingKey(true);
  };

  const saveApiKey = () => {
    if (vscode) {
      vscode.postMessage({
        command: "saveConfig",
        data: { geminiApiKey: tempApiKey },
      });
      setApiKey(tempApiKey);
      setIsEditingKey(false);
    }
  };

  const formatApiKey = (key: string) => {
    if (!key) return "";
    if (key.length <= 6) return key;
    return `${key.substring(0, 4)}****${key.substring(key.length - 2)}`;
  };

  return (
    <div className="flex flex-col w-full h-full bg-background text-foreground overflow-hidden relative">
      {/* Header / Brand */}
      <div className="flex items-center gap-2 p-4 border-b border-border/40 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight">Doc Generator</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">
            AI-Powered Tools
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8 cursor-pointer"
          onClick={handleReload}
          disabled={isReloading}
        >
          <RotateCw
            className={`h-4 w-4 ${isReloading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {isLoading ? (
        <MainSidebarSkeleton />
      ) : !isLoggedIn ? (
        /* UI KHI CHƯA LOGIN */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Chào mừng bạn</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vui lòng đăng nhập bằng Google để bắt đầu sử dụng các công cụ tạo
              tài liệu tự động.
            </p>
          </div>
          <Button
            onClick={handleLogin}
            className="cursor-pointer w-full h-11 flex items-center justify-center gap-2 shadow-md font-medium"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z"
                fill="#4285F4"
              />
              <path
                d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z"
                fill="#34A853"
              />
              <path
                d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z"
                fill="#EA4335"
              />
            </svg>
            <span>Tiếp tục với Google</span>
          </Button>
        </div>
      ) : (
        /* UI KHI ĐÃ LOGIN */
        <>
          <div className="flex-1 overflow-y-auto custom-scrollbar pb-[180px]">
            {/* Tool Selection */}
            <div className="p-4 space-y-6">
              <div className="space-y-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-1">
                  Công cụ chính
                </h2>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="cursor-pointer w-full h-auto p-3 flex items-center gap-3 border-border/50 hover:border-green-500/50 hover:bg-green-500/5 group bg-card transition-all"
                    onClick={navigateToSheet}
                  >
                    <div className="p-2.5 rounded-xl bg-green-500/10 group-hover:bg-green-500/20 shrink-0">
                      <FileSpreadsheet className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-[13px] font-semibold">Sheet Gen</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        Tự động tạo bảng tính từ dữ liệu
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-green-500 transition-colors shrink-0" />
                  </Button>

                  <Button
                    variant="outline"
                    className="cursor-pointer w-full h-auto p-3 flex items-center gap-3 border-border/50 hover:border-blue-500/50 hover:bg-blue-500/5 group bg-card transition-all"
                    onClick={navigateToDocs}
                  >
                    <div className="p-2.5 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 shrink-0">
                      <FileText className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-[13px] font-semibold">Docs Gen</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        Soạn thảo tài liệu thông minh
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-blue-500 transition-colors shrink-0" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section (User & Config) - Fixed to bottom */}
          <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 space-y-4 shrink-0 z-10">
            {/* API Key Record */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  <Key className="w-3 h-3" /> Gemini API
                </div>
                {!isEditingKey && apiKey && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 cursor-pointer"
                    onClick={startEditing}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              {isEditingKey || !apiKey ? (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      placeholder="Nhập API Key..."
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      onFocus={() => {
                        if (!isEditingKey) setTempApiKey(apiKey);
                      }}
                      className="h-8 text-xs bg-background pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md hover:bg-muted/50 transition-all cursor-pointer"
                    >
                      {showApiKey ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 px-3 cursor-pointer"
                    onClick={saveApiKey}
                  >
                    Lưu
                  </Button>
                </div>
              ) : (
                <div className="group relative flex items-center justify-between p-2 rounded-lg bg-card border border-border/50 transition-colors">
                  <span className="text-xs font-mono text-muted-foreground">
                    {formatApiKey(apiKey)}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="relative w-6 h-6 flex items-center justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute inset-0 w-6 h-6 opacity-0 group-hover:opacity-100 transition-all duration-200 text-muted-foreground hover:text-red-500 hover:bg-red-500/5 cursor-pointer z-10"
                        onClick={() => {
                          setApiKey("");
                          if (vscode) {
                            vscode.postMessage({
                              command: "saveConfig",
                              data: { geminiApiKey: "" },
                            });
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <CheckCircle2 className="w-4 h-4 text-green-500 transition-opacity duration-200 group-hover:opacity-0" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile & Logout */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/50 bg-card">
              <div className="flex items-center gap-3 min-w-0">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-9 h-9 rounded-full border border-border"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold truncate leading-tight">
                    {user?.name || "User"}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {user?.email}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="cursor-pointer text-muted-foreground hover:text-red-500 !hover:bg-red-500/5 transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const MainSidebarSkeleton = () => {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {/* Tool Selection Skeleton */}
        <div className="space-y-4">
          <div className="px-1 flex justify-between items-center">
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-[60px] w-full rounded-xl" />
            <Skeleton className="h-[60px] w-full rounded-xl" />
          </div>
        </div>

        {/* Feature List Skeleton */}
        <div className="space-y-4">
          <div className="px-1">
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>

      {/* Bottom Section Skeleton */}
      <div className="p-4 border-t border-border/40 bg-card/10 space-y-4 shrink-0">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 mx-1" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="flex items-center gap-3 p-2.5 rounded-xl border border-border/50 bg-background/40">
          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 w-32" />
          </div>
          <Skeleton className="w-6 h-6 rounded-md shrink-0" />
        </div>
      </div>
    </div>
  );
};
