import { useState, useEffect, useRef } from "react";
import { LogicalPosition, LogicalSize } from "@tauri-apps/api/window";
import { Input } from "./ui/input";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";

const SizePositions = ({ w }) => {
  const window_name = `widget-${w.id}`;

  const [positions, setPositions] = useState({
    h: "",
    w: "",
    x: "",
    y: "",
  });
  const timeoutRef = useRef(null);
  const isInitialMount = useRef(true);

  const handleChange = (key) => (e) => {
    const value = e.target.value;
    if (/^\d{0,4}$/.test(value)) {
      setPositions((prev) => ({ ...prev, [key]: value }));
    }
  };

  useEffect(() => {
    const loadWindowData = async () => {
      try {
        const appWindow = await WebviewWindow.getByLabel(window_name);

        if (!appWindow) {
          console.error("Window not found:", window_name);
          return;
        }

        const scaleFactor = (await appWindow.scaleFactor()) || 1;
        let size, position;

        if (typeof appWindow.innerSize === "function") {
          size = await appWindow.innerSize();
          position = await appWindow.innerPosition();
        } else {
          console.error("No size/position methods available");
          return;
        }

        // Safer conversion handling
        const lH = size.toLogical
          ? size.toLogical(scaleFactor).height
          : size.height / scaleFactor;
        const lW = size.toLogical
          ? size.toLogical(scaleFactor).width
          : size.width / scaleFactor;
        const lX = position.toLogical
          ? position.toLogical(scaleFactor).x
          : position.x / scaleFactor;
        const lY = position.toLogical
          ? position.toLogical(scaleFactor).y
          : position.y / scaleFactor;

        setPositions({
          h: Math.round(lH).toString(),
          w: Math.round(lW).toString(),
          x: Math.round(lX).toString(),
          y: Math.round(lY).toString(),
        });
      } catch (error) {
        console.error("Error loading window size/position:", error);
      }
    };

    loadWindowData();
  }, [window_name]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        const appWindow = await WebviewWindow.getByLabel(window_name);

        if (!appWindow) {
          console.error("Window not found:", window_name);
          return;
        }

        const { h, w: widthStr, x: xStr, y: yStr } = positions;

        let updatedConfig = { ...w };
        let changed = false;

        if (h && widthStr) {
          const height = parseInt(h);
          const widthNum = parseInt(widthStr);
          if (height > 0 && widthNum > 0) {
            await appWindow.setSize(new LogicalSize(widthNum, height));
            updatedConfig.width = widthNum;
            updatedConfig.height = height;
            changed = true;
          }
        }
        if (xStr !== "" && yStr !== "") {
          const xPos = parseInt(xStr);
          const yPos = parseInt(yStr);
          if (!isNaN(xPos) && !isNaN(yPos)) {
            await appWindow.setPosition(new LogicalPosition(xPos, yPos));
            updatedConfig.x = xPos;
            updatedConfig.y = yPos;
            changed = true;
          }
        }

        if (changed) {
          await invoke("update_widget_config", { config: updatedConfig });
        }
      } catch (error) {
        console.error("Error setting window size/position:", error);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [positions, window_name, w]);

  return (
    <div className="grid grid-cols-2 gap-2 w-[90%]">
      {[
        { label: "H", key: "h" },
        { label: "X", key: "x" },
        { label: "W", key: "w" },
        { label: "Y", key: "y" },
      ].map(({ label, key }) => (
        <div key={key} className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-sm">
            {label}
          </span>

          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={positions[key]}
            onChange={handleChange(key)}
            placeholder="500"
            className="p-2 pl-6.5 w-19 h-7"
          />

          <span className="pointer-events-none absolute inset-y-0 right-7 flex items-center text-sm">
            px
          </span>
        </div>
      ))}
    </div>
  );
};

export default SizePositions;
