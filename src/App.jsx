import { getCurrentWindow } from "@tauri-apps/api/window";
import React, {
  useState,
  useEffect,
  useCallback,
  Component as ReactComponent,
  useMemo,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import ControlPanel from "./ControlPanel";

const widgetModules = import.meta.glob("./widgets/*.widget/index.jsx", {
  eager: true,
});

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

  const widgetsData = useMemo(() => {
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
      invoke("get_widgets").then(setWidgets);
      listen("widgets-update", (e) => setWidgets(e.payload));
    }
  }, []);

  if (isControlWindow) return <ControlPanel />;

  if (!widgetId) return null;

  const widget = widgets.find((w) => w.id === widgetId);
  if (!widget) return null;

  const module = widgetsData[widget.w_type];
  if (!module) return null;

  return <WidgetHandler widgetInfo={widget} module={module} />;
}

export default App;
