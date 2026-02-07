import AppRouter from "./router";
import { ThemeProvider } from "./components/theme-provider";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AppRouter />
    </ThemeProvider>
  );
}

export default App;
