import { Settings2, X } from "lucide-react";
import { Button } from "./ui/button";
import { Activity, useState } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import AcrylicWindow from "./AcrylicWindow";
import AlwaysOn from "./AlwaysOn";
import SizePositions from "./SizePositions";

const WindowSettings = ({ w }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button
        size="icon-sm"
        variant="ghost"
        className={"text-[#ffffff90] border-none"}
        onClick={() => setOpen(!open)}
      >
        <Settings2 className="w-4 h-4" />
      </Button>
      <Activity mode={open ? "visible" : "hidden"}>
        <div
          className="fixed inset-0 bg-[#000000cc] backdrop-blur-xs z-99 h-[calc(100vh-28px)] mt-7 w-screen grid place-items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="min-h-1/2 w-[80%] bg-black rounded-md border border-[#ffffff17] p-3 px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between">
              <h1>
                {w.w_type} <span className="opacity-40">prefences</span>
              </h1>
              <button
                className="text-neutral-500 cursor-pointer"
                onClick={() => setOpen(!open)}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <SizePositions />
              <AcrylicWindow />
              <AlwaysOn />
            </div>
          </div>
        </div>
      </Activity>
    </div>
  );
};

export default WindowSettings;
