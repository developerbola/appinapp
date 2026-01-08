import { Input } from "./ui/input";
import { Label } from "./ui/label";

const SizePositions = () => {
  return (
    <div className="grid grid-cols-2 gap-2 w-[90%]">
      <div className="flex justify-between">
        <Label htmlFor={"h"}>height:</Label>
        <div className="relative">
          <Input
            id={"h"}
            type="number"
            placeholder="500"
            className="p-2 pr-7 w-18.75 h-7"
          />
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center pr-3 text-sm peer-disabled:opacity-50">
            px
          </span>
        </div>
      </div>
      <div className="flex justify-between">
        <Label htmlFor={"w"}>width:</Label>
        <div className="relative">
          <Input
            id={"w"}
            type="number"
            placeholder="500"
            className="p-2 pr-7 w-18.75 h-7"
          />
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center pr-3 text-sm peer-disabled:opacity-50">
            px
          </span>
        </div>
      </div>
      <div className="flex justify-between">
        <Label htmlFor={"x"}>x:</Label>
        <div className="relative">
          <Input
            id={"x"}
            type="number"
            placeholder="500"
            className="p-2 pr-7 w-18.75 h-7"
          />
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center pr-3 text-sm peer-disabled:opacity-50">
            px
          </span>
        </div>
      </div>
      <div className="flex justify-between">
        <Label htmlFor={"y"}>y:</Label>
        <div className="relative">
          <Input
            id={"y"}
            type="number"
            placeholder="500"
            className="p-2 pr-7 w-18.75 h-7"
          />
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center pr-3 text-sm peer-disabled:opacity-50">
            px
          </span>
        </div>
      </div>
    </div>
  );
};

export default SizePositions;
