import { useState } from "react";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";

const LaunchLogin = () => {
  const [launch, setLaunch] = useState(false);
  return (
    <Label className={`hover:bg-accent/50 flex items-center gap-3 rounded-lg border p-2 px-3 ${launch && "border-[#155dfc60] bg-[#155dfc30]"}`}>
      <Checkbox
        id="launch"
        defaultChecked
        checked={launch}
        onCheckedChange={setLaunch}
        className={launch && "border-[#2563eb] bg-[#2563eb] text-white"}
      />
      <div className="grid gap-1.5 font-normal">
        <p className="text-sm leading-none font-medium">Launch when login</p>
      </div>
    </Label>
  );
};

export default LaunchLogin;
