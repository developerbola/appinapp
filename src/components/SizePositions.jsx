import { useState } from "react";
import { Input } from "./ui/input";

const SizePositions = () => {
  const [positions, setPositions] = useState({
    h: "",
    w: "",
    x: "",
    y: "",
  });

  const handleChange = (key) => 
    (e) => {
      const value = e.target.value;
      if (/^\d{0,4}$/.test(value)) {
        setPositions((prev) => ({ ...prev, [key]: value }));
      }
    };

  return (
    <div className="grid grid-cols-2 gap-2 w-[90%]">
      {[
        { label: "H", key: "h" },
        { label: "W", key: "w" },
        { label: "X", key: "x" },
        { label: "Y", key: "y" },
      ].map(({ label, key }) => (
        <div key={key} className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-sm">
            {label}
          </span>

          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={positions[key]}
            onChange={handleChange(key)}
            placeholder="500"
            className="p-2 pl-6.5 w-19 h-7"
          />

          <span className="pointer-events-none absolute inset-y-0 right-7 flex items-center text-sm">
            px
          </span>
        </div>
      ))}
    </div>
  );
};

export default SizePositions;
