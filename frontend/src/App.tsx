import { useEffect, useState } from "react";
import "./App.css";
import { useTheme } from "./hooks/useTheme";
import Sidebar from "./pages/layouts/Sidebar";
import Topbar from "./pages/layouts/Topbar";
import Reporting from "./pages/logging/Reporting";
import SystemSetting from "./pages/management/SystemSetting";
import Alarms from "./pages/monitoring/Alarms";
import Overview from "./pages/monitoring/Overview";
import PipeNetwork from "./pages/monitoring/PipeNetwork";
import Trends from "./pages/monitoring/Trends";
import type { PageName } from "./utils/ScdTypes";

const pages: Record<PageName, () => React.JSX.Element> = {
  Overview,
  "Pipe Network": PipeNetwork,
  Trends,
  Alarms,
  "System settings": SystemSetting,
  Reporting,
};

export default function App() {
  const [activePage, setActivePage] = useState<PageName>("Overview");
  const [time, setTime] = useState(() => new Date());
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const ActivePage = pages[activePage];

  return (
    <div className="app-shell">
      <aside><Sidebar active={activePage} setActive={setActivePage} /></aside>
      <main>
        <Topbar theme={theme} time={time} onToggleTheme={toggleTheme} />
        <ActivePage />
      </main>
    </div>
  );
}
