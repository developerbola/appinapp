import { getCurrentWindow } from "@tauri-apps/api/window";
import React, { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import ControlPanel from "./ControlPanel";

// Dynamic Widget Imports using Vite's glob import
const widgetModules = import.meta.glob("./widgets/*.jsx", { eager: true });

const WIDGET_COMPONENTS = Object.keys(widgetModules).reduce((acc, path) => {
  // Extract filename without extension: ./widgets/ClockWidget.jsx -> ClockWidget
  const name = path
    .split("/")
    .pop()
    .replace(/\.jsx$/, "");
  acc[name] = widgetModules[path].default;
  return acc;
}, {});

console.log("App.jsx: Detected Widgets:", Object.keys(WIDGET_COMPONENTS));

function App() {
  const [isControlWindow, setIsControlWindow] = useState(false);
  const [widgets, setWidgets] = useState([]); // List of active widgets

  useEffect(() => {
    // Determine if we are in the control window
    const currentWindow = getCurrentWindow();
    if (currentWindow.label === "control") {
      setIsControlWindow(true);
      document.body.style.backgroundColor = "#1e1e1e"; // Reset bg for control
      document.body.style.overflow = "auto"; // Enable scroll
    } else {
      // We are in the widget layer. Fetch widgets.
      invoke("get_widgets").then(setWidgets);

      // Listen for updates
      listen("widgets-update", (event) => {
        setWidgets(event.payload);
      });
    }
  }, []);

  React.useEffect(() => {
    if (isControlWindow) return;

    // Function to calculate and send widget rects
    const updateRects = () => {
      const widgets = document.querySelectorAll(".widget");
      const rects = Array.from(widgets).map((w) => {
        const r = w.getBoundingClientRect();
        return {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
        };
      });

      invoke("update_widget_rects", { rects });
    };

    // Initial check
    updateRects();

    // Set up a resize observer to track layout changes
    const observer = new ResizeObserver(() => {
      updateRects();
    });

    document.querySelectorAll(".widget").forEach((w) => observer.observe(w));

    // Also poll occasionally in case of animations or drags?
    const interval = setInterval(updateRects, 1000);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [widgets]); // Re-run when widgets change (new DOM elements)

  if (isControlWindow) {
    return <ControlPanel />;
  }

  return (
    <div className="widget-layer">
      {widgets.map((w) => {
        const WidgetComponent = WIDGET_COMPONENTS[w.w_type];

        if (!WidgetComponent) {
          console.warn(
            `Widget type "${w.w_type}" not found in WIDGET_COMPONENTS`
          );
          return null;
        }
        return <WidgetComponent key={w.id} />;
      })}
    </div>
  );
}

export default App;
