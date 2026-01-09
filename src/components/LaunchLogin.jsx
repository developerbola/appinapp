import { useState, useEffect } from "react";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { invoke } from "@tauri-apps/api/core";

const LaunchLogin = () => {
  const [launch, setLaunch] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load initial state on mount
  useEffect(() => {
    const loadLaunchState = async () => {
      try {
        const isEnabled = await invoke("is_launch_at_login_enabled");
        setLaunch(isEnabled);
      } catch (error) {
        console.error("Error loading launch at login state:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLaunchState();
  }, []);

  const handleToggle = async (checked) => {
    try {
      await invoke("set_launch_at_login", { enable: checked });
      setLaunch(checked);
      console.log(`Launch at login ${checked ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Error setting launch at login:", error);
      // Revert on error
      setLaunch(!checked);
    }
  };

  if (loading) {
    return (
      <Label className="hover:cursor-pointer! flex items-center gap-3 rounded-lg border p-2 px-3">
        <Checkbox disabled />
        <div className="grid gap-1.5 font-normal">
          <p className="text-sm leading-none font-medium">Launch when login</p>
        </div>
      </Label>
    );
  }

  return (
    <Label
      className={`hover:cursor-pointer! flex items-center gap-3 rounded-lg border p-2 px-3 ${
        launch && "border-[#155dfc60] bg-[#155dfc30]"
      }`}
    >
      <Checkbox
        id="launch"
        checked={launch}
        onCheckedChange={handleToggle}
        className={` ${
          launch && "border-[#2563eb]! bg-[#2563eb]! text-white!"
        }`}
      />
      <div className="grid gap-1.5 font-normal">
        <p className="text-sm leading-none font-medium">Launch when login</p>
      </div>
    </Label>
  );
};

export default LaunchLogin;
