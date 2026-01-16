import { useState, useEffect } from "react";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";

const LaunchLogin = () => {
  const [launch, setLaunch] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLaunchState = async () => {
      try {
        const isEnabled = await invoke("is_launch_at_login_enabled");
        setLaunch(!!isEnabled);
      } catch (error) {
        console.error("Error loading launch at login state:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLaunchState();
  }, []);

  const handleToggle = async (checked) => {
    // Determine the target state (handle the boolean | 'indeterminate' case)
    const targetState = checked === true;

    // Save previous state for rollback
    const previousState = launch;

    // Optimistic update
    setLaunch(targetState);

    try {
      await invoke("set_launch_at_login", { enable: targetState });
      console.log(`Launch at login ${targetState ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Error setting launch at login:", error);
      // Revert on error
      setLaunch(previousState);
    }
  };

  if (loading) {
    return (
      <Label className="hover:cursor-pointer! flex items-center gap-3 rounded-lg border border-[#ffffff12] p-2 px-3 opacity-50">
        <Checkbox disabled />
        <div className="grid gap-1.5 font-normal">
          <p className="text-sm leading-none font-medium">Launch when login</p>
        </div>
      </Label>
    );
  }

  return (
    <Label
      className={cn(
        "hover:cursor-pointer! flex items-center gap-3 rounded-lg border p-2 px-3 transition-colors duration-200",
        launch ? "border-[#155dfc60] bg-[#155dfc30]" : "border-[#ffffff12]"
      )}
    >
      <Checkbox
        id="launch"
        checked={launch}
        onCheckedChange={handleToggle}
        className={cn(
          "transition-all duration-200",
          launch && "border-[#2563eb]! bg-[#2563eb]! text-white!"
        )}
      />
      <div className="grid gap-1.5 font-normal">
        <p className="text-sm leading-none font-medium">Launch when login</p>
      </div>
    </Label>
  );
};

export default LaunchLogin;
