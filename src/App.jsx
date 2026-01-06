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

const widgetModules = import.meta.glob("./widgets/*.widget/index.jsx", {
  eager: true,
});

const ALL_WIDGETS = Object.keys(widgetModules).reduce((acc, path) => {
  const name = path.split("/")[2].replace(".widget", "");
  acc[name] = widgetModules[path];
  return acc;
}, {});

class ErrorBoundary extends ReactComponent {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Widget Crash:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          className="widget"
          style={{
            background: "rgba(255,0,0,0.1)",
            color: "red",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid red",
            fontSize: "12px",
            maxWidth: "300px",
          }}
        >
          <strong>Widget "{this.props.name}" Crashed</strong>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: "10px" }}>
            {this.state.error?.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const WidgetHandler = ({ widgetInfo }) => {
  const module = ALL_WIDGETS[widgetInfo.w_type];
  if (!module) return null;

  const Component = module.default;
  const command = module.command;
  const refreshFrequency = module.refreshFrequency;

  const [output, setOutput] = useState("");
  const [error, setError] = useState(null);

  const run = useCallback(async (cmd) => {
    try {
      return await invoke("execute_command", { command: cmd });
    } catch (err) {
      console.error("Widget run() error:", err);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (!command) return;

    const runCommand = async () => {
      try {
        const result = await invoke("execute_command", { command });
        setOutput(result);
        setError(null);
      } catch (err) {
        console.error("Widget Command Error:", err);
        setError(err);
      }
    };

    runCommand();

    if (refreshFrequency) {
      const interval = setInterval(runCommand, refreshFrequency);
      return () => clearInterval(interval);
    }
  }, [command, refreshFrequency]);

  if (!Component) {
    return (
      <div
        className="widget"
        style={{ color: "red", background: "black", padding: "10px" }}
      >
        Error: Widget "{widgetInfo.w_type}" has no default export.
      </div>
    );
  }

  return (
    <ErrorBoundary name={widgetInfo.w_type}>
      {module.className && (
        <style>
          {`
            /* Global styles (keyframes, etc) */
            ${module.className}
            
            /* Scoped/prefixed styles if needed, though we rely on container layout */
            .widget-container.widget-${widgetInfo.w_type} {
               /* any specific wrapper styles */
            }
          `}
        </style>
      )}
      <div className={`widget-container widget-${widgetInfo.w_type}`}>
        <Component output={output} error={error} run={run} />
      </div>
    </ErrorBoundary>
  );
};

function App() {
  const [isControlWindow, setIsControlWindow] = useState(false);
  const [widgetId, setWidgetId] = useState(null);
  const [widgets, setWidgets] = useState([]);

  useEffect(() => {
    const currentWindow = getCurrentWindow();
    const label = currentWindow.label;

    if (label === "control") {
      setIsControlWindow(true);
      document.documentElement.style.backgroundColor = "#0a0a0a";
    } else if (label.startsWith("widget-")) {
      const id = label.replace("widget-", "");
      setWidgetId(id);

      invoke("get_widgets").then(setWidgets);

      listen("widgets-update", (event) => {
        setWidgets(event.payload);
      });
    } else {
      // Main window or others - usually hidden now per backend changes
    }
  }, []);

  if (isControlWindow) {
    return <ControlPanel />;
  }

  if (widgetId) {
    const widget = widgets.find((w) => w.id === widgetId);
    if (!widget) return null;

    return (
      <div className="h-screen w-screen overflow-hidden bg-red-300!">
        <WidgetHandler widgetInfo={widget} />
      </div>
    );
  }

  return <div />;
}

export default App;
