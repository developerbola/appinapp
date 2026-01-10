import { getCurrentWindow } from "@tauri-apps/api/window";
import React, {
  useState,
  useEffect,
  useCallback,
  Component as ReactComponent,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import ControlPanel from "./ControlPanel";
import { widgetFolderAtom } from "./atoms/atoms";
import { useAtom } from "jotai";

class ErrorBoundary extends ReactComponent {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Widget crash:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="relative"
          style={{
            color: "red",
            padding: 12,
            background: "#00000040",
            width: "100vw",
            height: "100vh",
            overflowY: "auto",
          }}
        >
          Widget crashed: {this.state.error?.message}
        </div>
      );
    }
    return this.props.children;
  }
}

const WidgetHandler = ({ widgetInfo, module }) => {
  if (!module) return null;

  const Component = module.default;
  const command = module.command;
  const refreshFrequency = module.refreshFrequency;

  const [output, setOutput] = useState("");
  const [error, setError] = useState(null);

  const run = useCallback(async (cmd) => {
    return invoke("execute_command", { command: cmd });
  }, []);

  useEffect(() => {
    if (!command) return;

    const exec = async () => {
      try {
        const result = await invoke("execute_command", { command });
        setOutput(result);
        setError(null);
      } catch (e) {
        setError(e);
      }
    };

    exec();

    if (refreshFrequency) {
      const id = setInterval(exec, refreshFrequency);
      return () => clearInterval(id);
    }
  }, [command, refreshFrequency]);

  return (
    <ErrorBoundary name={widgetInfo.w_type}>
      {module.className && <style>{module.className}</style>}
      <Component output={output} error={error} run={run} />
    </ErrorBoundary>
  );
};

function App() {
  const [isControlWindow, setIsControlWindow] = useState(false);
  const [widgetId, setWidgetId] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [widgetFolder] = useAtom(widgetFolderAtom);

  // Load widgets from both built-in and custom folder
  const widgetModules = import.meta.glob("./widgets/*.widget/index.jsx", {
    eager: true,
  });

  const widgetsData = React.useMemo(() => {
    return Object.keys(widgetModules).reduce((acc, path) => {
      const name = path.split("/")[2].replace(".widget", "");
      acc[name] = widgetModules[path];
      return acc;
    }, {});
  }, []);

  useEffect(() => {
    const win = getCurrentWindow();
    const label = win.label;

    if (label === "control") {
      setIsControlWindow(true);
      document.documentElement.style.backgroundColor = "#0a0a0a";
      return;
    }

    if (label.startsWith("widget-")) {
      setWidgetId(label.replace("widget-", ""));
      // Pass folder path to backend
      invoke("get_widgets", { folderPath: widgetFolder })
        .then(setWidgets)
        .catch((err) => {
          console.error("Failed to get widgets:", err);
          // Fallback to getting widgets without folder path
          invoke("get_widgets").then(setWidgets);
        });

      const unlisten = listen("widgets-update", (e) => setWidgets(e.payload));

      return () => {
        unlisten.then((fn) => fn());
      };
    }
  }, [widgetFolder]);

  if (isControlWindow) return <ControlPanel />;

  if (!widgetId) return null;

  const widget = widgets.find((w) => w.id === widgetId);
  if (!widget) return null;

  const module = widgetsData[widget.w_type];
  if (!module) {
    return (
      <div
        style={{
          color: "orange",
          padding: 12,
          background: "#00000040",
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <p>Widget type not found: {widget.w_type}</p>
        <p style={{ fontSize: "12px", marginTop: "8px", opacity: 0.7 }}>
          Make sure the widget exists in: {widgetFolder}
        </p>
      </div>
    );
  }

  return <WidgetHandler widgetInfo={widget} module={module} />;
}

export default App;
