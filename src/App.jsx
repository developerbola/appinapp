import {
  getCurrentWindow,
  LogicalPosition,
  LogicalSize,
} from "@tauri-apps/api/window";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import React, {
  useState,
  useEffect,
  useCallback,
  Component as ReactComponent,
} from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
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

  useEffect(() => {
    const applyWindowPrefs = async () => {
      try {
        const win = getCurrentWebviewWindow();
        const { windowWidth, windowHeight, windowTop, windowLeft } = module;

        if (windowWidth && windowHeight) {
          await win.setSize(new LogicalSize(windowWidth, windowHeight));
        }

        if (windowTop !== undefined && windowLeft !== undefined) {
          await win.setPosition(new LogicalPosition(windowLeft, windowTop));
        }
      } catch (err) {
        console.error("Failed to apply window preferences:", err);
      }
    };

    applyWindowPrefs();
  }, [module]);

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
  const [externalModules, setExternalModules] = useState({});
  const [isLoadingExternal, setIsLoadingExternal] = useState(false);

  useEffect(() => {
    const win = getCurrentWindow();
    const label = win.label;

    if (label === "control") {
      setIsControlWindow(true);
      document.documentElement.style.backgroundColor = "#0a0a0a";
      return;
    }

    if (label.startsWith("widget-")) {
      const id = label.replace("widget-", "");
      setWidgetId(id);

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

  useEffect(() => {
    if (!widgetId || !widgets.length || !widgetFolder) return;

    const widget = widgets.find((w) => w.id === widgetId);
    if (!widget) return;

    const type = widget.w_type;
    if (externalModules[type]) return;

    const loadExternal = async () => {
      setIsLoadingExternal(true);
      try {
        const normalizedFolder = widgetFolder.endsWith("/")
          ? widgetFolder
          : `${widgetFolder}/`;

        const possibleExtensions = ["js", "jsx"];
        let loadedModule = null;
        let lastError = null;

        for (const ext of possibleExtensions) {
          const path = `${normalizedFolder}${type}.widget/index.${ext}`;
          let importUrl = null;

          try {
            if (import.meta.env.DEV) {
              importUrl = `/@fs${path}`;
            } else {
              // In production, we read the file content via backend
              // and create a Blob URL to avoid protocol issues with dynamic import() on WebKit
              const content = await invoke("read_widget_file", { path });
              const blob = new Blob([content], {
                type: "application/javascript",
              });
              importUrl = URL.createObjectURL(blob);
            }

            const module = await import(/* @vite-ignore */ importUrl);
            if (module) {
              loadedModule = module;
              if (!import.meta.env.DEV && importUrl) {
                // We keep the URL for a bit to ensure it's loaded,
                // but technically import() is done here.
                setTimeout(() => URL.revokeObjectURL(importUrl), 100);
              }
              break;
            }
          } catch (e) {
            if (!import.meta.env.DEV && importUrl) {
              URL.revokeObjectURL(importUrl);
            }
            lastError = e;
          }
        }

        if (loadedModule) {
          setExternalModules((prev) => ({ ...prev, [type]: loadedModule }));
        } else {
          throw (
            lastError ||
            new Error(
              `Could not find index.js or index.jsx for widget type ${type}`
            )
          );
        }
      } catch (err) {
        console.error(`Failed to load external widget type ${type}:`, err);
      } finally {
        setIsLoadingExternal(false);
      }
    };

    loadExternal();
  }, [widgetId, widgets, widgetFolder, externalModules]);

  if (isControlWindow) return <ControlPanel />;

  if (!widgetId) return null;

  const widget = widgets.find((w) => w.id === widgetId);
  if (!widget) return null;

  const module = externalModules[widget.w_type];

  if (!module) {
    if (isLoadingExternal) {
      return (
        <div style={{ color: "white", padding: 12, background: "#00000040" }}>
          Loading widget...
        </div>
      );
    }

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
