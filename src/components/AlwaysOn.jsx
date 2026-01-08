import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useState } from "react";

const AlwaysOn = () => {
  const [alwaysOn, setAlwaysOn] = useState("none");

  return (
    <div className="flex items-center justify-between px-3">
      <span className="font-normal text-[14px]">AlwaysOn</span>
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
          value="bottom"
          aria-label="Toggle bottom"
          className={`cursor-pointer text-[#ffffff40] px-0 ${alwaysOn == "bottom" && "text-white"}`}
        >
          bottom
        </ToggleGroupItem>
        <ToggleGroupItem
          value="none"
          aria-label="Toggle none"
          className={`cursor-pointer text-[#ffffff40] px-0 ${alwaysOn == "none" && "text-white"}`}
        >
          none
        </ToggleGroupItem>
        <ToggleGroupItem
          value="top"
          aria-label="Toggle top"
          className={`cursor-pointer text-[#ffffff40] px-0 ${alwaysOn == "top" && "text-white"}`}
        >
          top
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default AlwaysOn;
