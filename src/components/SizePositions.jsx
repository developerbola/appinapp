import { useState, useEffect, useRef } from "react";
import {
  PhysicalPosition,
  PhysicalSize,
} from "@tauri-apps/api/window";
import { Input } from "./ui/input";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

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
        
        
        // Try innerSize/outerPosition first (standard API)
        let size, position;
        
        if (typeof appWindow.innerSize === 'function') {
          size = await appWindow.innerSize();
          position = await appWindow.outerPosition();
        } else if (typeof appWindow.size === 'function') {
          size = await appWindow.size();
          position = await appWindow.position();
        } else {
          console.error("No size/position methods available");
          return;
        }


        setPositions({
          h: Math.round(size.height).toString(),
          w: Math.round(size.width).toString(),
          x: Math.round(position.x).toString(),
          y: Math.round(position.y).toString(),
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

        const { h, w: width, x, y } = positions;

        if (h && width) {
          const height = parseInt(h);
          const widthNum = parseInt(width);
          if (height > 0 && widthNum > 0) {
            await appWindow.setSize(new PhysicalSize(widthNum, height));
          }
        }

        if (x !== "" && y !== "") {
          const xPos = parseInt(x);
          const yPos = parseInt(y);
          if (!isNaN(xPos) && !isNaN(yPos)) {
            await appWindow.setPosition(new PhysicalPosition(xPos, yPos));
          }
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
  }, [positions, window_name]);

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