import { useState, useEffect, useRef } from "react";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

const AcrylicWindow = ({ w }) => {
  const window_name = `widget-${w.id}`;
  const [enabled, setEnabled] = useState(false);
  const intervalRef = useRef(null);

  const applyEffect = async (appWindow) => {
    try {
      let effect = "hudWindow";
      await appWindow.setEffects({
        effects: [effect],
        state: "active",
        radius: 8,
      });
    } catch (error) {
      // Silently fail - this will retry on next interval
    }
  };

  const clearEffect = async (appWindow) => {
    try {
      // Try clearing with empty effects array first
      await appWindow.clearEffects();
    } catch (error) {
      console.error("Error clearing effect:", error);
    }
  };

  useEffect(() => {
    const manageEffect = async () => {
      try {
        const appWindow = await WebviewWindow.getByLabel(window_name);
        
        if (!appWindow) {
          console.error("Window not found:", window_name);
          return;
        }

        if (!enabled) {
          // Clear interval and effect when disabled
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          await clearEffect(appWindow);
          return;
        }

        // Apply effect immediately
        await applyEffect(appWindow);

        // Set up aggressive polling to maintain effect (every 200ms)
        intervalRef.current = setInterval(async () => {
          try {
            const win = await WebviewWindow.getByLabel(window_name);
            if (win) {
              await applyEffect(win);
            }
          } catch (error) {
            // Silently retry
          }
        }, 200);

      } catch (error) {
        console.error("Error managing effect:", error);
      }
    };

    manageEffect();

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, window_name]);

  const handleToggle = async (checked) => {
    setEnabled(checked);
  };

  return (
    <Label
      className={`cursor-pointer mt-1 border border-[#ffffff18] relative flex items-center justify-between rounded-md p-2 px-3 ${
        enabled && "border-[#155dfc60] bg-[#155dfc30]"
      }`}
    >
      <span className="font-normal">Acrylic window</span>
      <Switch
        aria-describedby={"acrylic-description"}
        checked={enabled}
        onCheckedChange={handleToggle}
      />
    </Label>
  );
};

export default AcrylicWindow;