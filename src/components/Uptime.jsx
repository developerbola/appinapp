import { useEffect, useState } from "react";

const Uptime = () => {
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setUptime((u) => u + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;

  return (
    <div className="p-4 flex flex-col gap-1">
      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
        Uptime
      </span>
      <div className="flex items-end gap-2 font-mono text-3xl font-bold">
        <div>
          {hours > 0 && (
            <>
              <span>
                {hours < 10 && <span className="text-[#ffffff30]">0</span>}
                {hours}
              </span>
              <span className="text-sm text-[#ffffffa2]">H</span>
            </>
          )}
        </div>
        <div>
          <span>
            {minutes < 10 && <span className="text-[#ffffff30]">0</span>}
            {minutes}
          </span>
          <span className="text-sm text-[#ffffffa2]">M</span>
        </div>
        {!hours && (
          <div>
            <span>
              {seconds < 10 && <span className="text-[#ffffff30]">0</span>}
              {seconds}
            </span>
            <span className="text-sm text-[#ffffffa2]">S</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Uptime;
