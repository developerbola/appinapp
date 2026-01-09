import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useState, useEffect } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

const AlwaysOn = ({ w }) => {
  const window_name = `widget-${w.id}`;
  const [alwaysOn, setAlwaysOn] = useState("none");

  useEffect(() => {
    const applyAlwaysOn = async () => {
      try {
        const appWindow = await WebviewWindow.getByLabel(window_name);

        if (!appWindow) {
          console.error("Window not found:", window_name);
          return;
        }

        if (alwaysOn === "top") {
          await appWindow.setAlwaysOnTop(true);
        } else {
          await appWindow.setAlwaysOnTop(false);
        }
      } catch (error) {
        console.error("Error setting always-on-top:", error);
      }
    };

    applyAlwaysOn();
  }, [alwaysOn, window_name]);

  return (
    <div className="flex items-center justify-between px-3">
      <span className="font-normal text-[14px]">Always on top</span>
      <ToggleGroup
        type="single"
        size={"sm"}
        value={alwaysOn}
        onValueChange={(value) => {
          if (value) setAlwaysOn(value);
        }}
        className={"flex gap-3"}
      >
        <ToggleGroupItem
          value="none"
          aria-label="Toggle none"
          className={`bg-transparent! cursor-pointer text-[#ffffff40] px-0 ${
            alwaysOn == "none" && "text-white"
          }`}
        >
          none
        </ToggleGroupItem>
        <ToggleGroupItem
          value="top"
          aria-label="Toggle top"
          className={`bg-transparent! cursor-pointer text-[#ffffff40] px-0 ${
            alwaysOn == "top" && "text-white"
          }`}
        >
          top
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default AlwaysOn;
