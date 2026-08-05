import Icon from "../../utils/NonLibShapes";
import type { Theme } from "../../utils/ScdTypes";

interface TopbarProps {
  theme: Theme;
  time: Date;
  onToggleTheme: () => void;
}

export default function Topbar({ theme, time, onToggleTheme }: TopbarProps) {
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <header className="topbar">
      <div className="mobile-brand">
        FLOW<span>OPS</span>
      </div>
      <div className="system-state">
        <i /> SYSTEM ONLINE <span>•</span> ALL SERVICES OPERATIONAL
      </div>
      <div className="top-actions">
        <button
          className="theme-toggle"
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${nextTheme} mode`}
          title={`Switch to ${nextTheme} mode`}
        >
          <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
          <small>{theme === "dark" ? "Light" : "Dark"}</small>
        </button>
        <div className="clock">
          <b>
            {time.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}{" "}
            WIB
          </b>
          <small>
            {time
              .toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
              .toUpperCase()}
          </small>
        </div>
        <button className="notification" aria-label="Notifications">
          <Icon name="bell" />
          <i />
        </button>
      </div>
    </header>
  );
}
