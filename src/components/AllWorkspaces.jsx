import { useState, useEffect } from "react";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

const AllWorkspaces = ({ w }) => {
  const window_name = `widget-${w.id}`;
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeState = async () => {
      try {
        const webview = await WebviewWindow.getByLabel(window_name);
        const isVisible = await webview.isVisibleOnAllWorkspaces();
        setEnabled(isVisible);
      } catch (error) {
        console.error("Failed to get workspace visibility:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initializeState();
  }, []);

  const handleToggle = async (checked) => {
    setEnabled(checked);
    try {
      const webview = await WebviewWindow.getByLabel(window_name);
      await webview.setVisibleOnAllWorkspaces(checked);
    } catch (error) {
      console.error("Failed to set workspace visibility:", error);
      setEnabled(!checked);
    }
  };

  return (
    <Label
      className={`cursor-pointer mt-1 border border-[#ffffff18] relative flex items-center justify-between rounded-md p-2 px-3 ${
        enabled && "border-[#00bc7d60] bg-[#00bc7d30]"
      } ${isLoading && "opacity-50"}`}
    >
      <span className="font-normal">On all workspaces</span>
      <Switch
        aria-describedby={"allworkspaces-description"}
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={isLoading}
      />
    </Label>
  );
};

export default AllWorkspaces;
