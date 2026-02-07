import { Button } from "@/components/ui/button";

// Khai báo kiểu cho VS Code API
declare function acquireVsCodeApi(): {
  postMessage(message: any): void;
};

const vscode =
  typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null;

export default function MainSidebar() {
  const handleLogin = () => {
    if (vscode) {
      vscode.postMessage({ command: "login" });
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full p-4 h-screen bg-background">
      <div className="space-y-2">
        <h1 className="text-xl font-bold">Doc Gen</h1>
        <p className="text-sm text-muted-foreground">
          Đăng nhập để bắt đầu tạo sheet tự động.
        </p>
      </div>
      <Button onClick={handleLogin} className="w-full">
        Đăng nhập
      </Button>
    </div>
  );
}
