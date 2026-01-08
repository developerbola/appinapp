import { useState } from "react";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

const AcrylicWindow = () => {
  const [enabled, setEnabled] = useState(false);

  return (
    <Label
      className={`mt-1 border border-[#ffffff18] relative flex items-center justify-between rounded-md p-2 px-3 ${enabled && "border-[#155dfc60] bg-[#155dfc30]"}`}
    >
      <span className="font-normal">Acrylic window</span>
      <Switch
        aria-describedby={"acrylic-description"}
        checked={enabled}
        onCheckedChange={setEnabled}
      />
    </Label>
  );
};

export default AcrylicWindow;
