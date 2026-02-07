import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import MainSidebar from "../pages/main-sidebar";
import SheetGenerator from "../pages/sheet-generator";

declare global {
  interface Window {
    initialRoute?: string;
  }
}

export default function AppRouter() {
  // Ưu tiên route từ extension, nếu không có thì mặc định vào sidebar
  const initialRoute = window.initialRoute || "/main-sidebar";

  return (
    <HashRouter>
      <Routes>
        {/* Luôn chuyển hướng từ gốc sang initialRoute được chỉ định */}
        <Route path="/" element={<Navigate to={initialRoute} replace />} />

        <Route path="/sheet-generator" element={<SheetGenerator />} />
        <Route path="/main-sidebar" element={<MainSidebar />} />

        {/* Catch-all: nếu vào route lạ thì cũng quay về initialRoute */}
        <Route path="*" element={<Navigate to={initialRoute} replace />} />
      </Routes>
    </HashRouter>
  );
}
