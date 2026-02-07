import { Button } from "@/components/ui/button";

export default function SheetGenerator() {
  return (
    <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Sheet Generator</h1>
        <p className="text-muted-foreground">
          Tạo và quản lý các tài liệu mẫu của bạn tại đây.
        </p>
      </div>

      <div className="grid gap-4 p-6 border rounded-xl bg-card shadow-sm">
        <h2 className="text-xl font-semibold">Cấu hình tài liệu</h2>
        <div className="h-32 flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
          Khu vực thiết lập (Đang phát triển...)
        </div>
        <Button className="w-fit">Bắt đầu tạo Sheet</Button>
      </div>
    </div>
  );
}
