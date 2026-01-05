import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Terminal, Activity, Zap, RefreshCw, Trash } from "lucide-react";

// Dynamic Widget Imports
const widgetModules = import.meta.glob("./widgets/*.jsx", { eager: true });

const ControlPanel = () => {
  const [widgets, setWidgets] = useState([]);
  const [uptime, setUptime] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generate metadata for available widget types dynamically from file system
  const widgetTypes = useMemo(() => {
    return Object.keys(widgetModules).reduce((acc, path) => {
      const name = path
        .split("/")
        .pop()
        .replace(/\.jsx$/, "");

      const labels = {
        ClockWidget: {
          label: "Clock",
          description: "Real-time Desktop Clock",
          icon: "🕒",
          color: "#4D96FF",
        },
      };

      acc[name] = labels[name] || {
        label: name.replace(/([A-Z])/g, " $1").trim(),
        description: "Desktop Extension Module",
        icon: "🧩",
        color: "#6BCB77",
      };
      return acc;
    }, {});
  }, []);

  const fetchWidgets = async () => {
    setIsRefreshing(true);
    try {
      const list = await invoke("get_widgets");
      setWidgets(list);
    } catch (err) {
      console.error("Failed to fetch widgets:", err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchWidgets();

    const unlisten = listen("widgets-update", (event) => {
      setWidgets(event.payload);
    });

    const timer = setInterval(() => setUptime((u) => u + 1), 1000);

    return () => {
      unlisten.then((f) => f());
      clearInterval(timer);
    };
  }, []);

  const addWidget = async (type) => {
    console.log("ControlPanel: Requesting to add widget of type:", type);
    try {
      await invoke("add_widget", { wType: type });
      await fetchWidgets();
    } catch (err) {
      console.error("Failed to add widget:", err);
    }
  };

  const removeWidget = async (id) => {
    try {
      await invoke("remove_widget", { id });
      await fetchWidgets();
    } catch (err) {
      console.error("Failed to remove widget:", err);
    }
  };

  return (
    <>
      <div
        data-tauri-drag-region
        id="titlebar"
        className="fixed inset-0 h-[28px] w-full z-9999 bg-[#00000020] backdrop-blur-xl"
      />
      <div className="relative flex flex-col h-screen overflow-y-auto overscroll-contain bg-[#09090b] text-zinc-100 font-sans selection:bg-white/10 pt-[28px]">
        {/* Navbar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <Terminal className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">OS CORE UNIT</h1>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                v0.4.0 • SYSTEM ACTIVE
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 transition-transform duration-700 ${
                isRefreshing ? "rotate-180" : ""
              }`}
              onClick={fetchWidgets}
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  isRefreshing ? "text-green-400" : "text-zinc-500"
                }`}
              />
            </Button>
            <Badge className="border-none bg-green-600/40 text-green-600 focus-visible:ring-green-600/20 focus-visible:outline-none dark:bg-green-400/10 dark:text-green-400 dark:focus-visible:ring-green-400/40 [a&]:hover:bg-green-600/5 dark:[a&]:hover:bg-green-400/5">
              <span
                className="size-1.5 rounded-full bg-green-600 dark:bg-green-400"
                aria-hidden="true"
              />
              Stable
            </Badge>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8 max-w-4xl mx-auto">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-zinc-900/50 border-white/5">
                <CardContent className="p-4 flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                    Active Units
                  </span>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold font-mono">
                      {widgets.length}
                    </span>
                    <Activity className="w-4 h-4 text-green-400 mb-1.5" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/50 border-white/5">
                <CardContent className="p-4 flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                    Process Time
                  </span>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold font-mono">
                      {Math.floor(uptime / 60)}
                      <span className="text-sm text-zinc-500">M</span>{" "}
                      {uptime % 60}
                      <span className="text-sm text-zinc-500">S</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <div className="flex items-center gap-4 mb-4">
                <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                  Deployment Registry
                </h2>
                <Separator className="flex-1 bg-white/5" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(widgetTypes).map(([type, meta]) => (
                  <div
                    key={type}
                    className="bg-[#ffffff0a] cursor-pointer"
                    onClick={() => addWidget(type)}
                  >
                    <div className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        {meta.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-sm tracking-tight">
                          {meta.label}
                        </h3>
                        <p className="text-xs text-zinc-500 line-clamp-1">
                          {meta.description}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-4 mb-4">
                <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                  Active Subprocesses
                </h2>
                <Separator className="flex-1 bg-white/5" />
              </div>
              <div className="space-y-3">
                {widgets.map((w) => {
                  const meta = widgetTypes[w.w_type] || {
                    label: "Unknown",
                    icon: "❓",
                    color: "#888",
                    description: "Internal subprocess",
                  };

                  return (
                    <div
                      key={w.id}
                      className="bg-[#ffffff10] border-white/5 border-l-2"
                      style={{ borderLeftColor: meta.color }}
                    >
                      <div className="p-4 flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                          style={{
                            backgroundColor: `${meta.color}15`,
                            color: meta.color,
                          }}
                        >
                          {meta.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold tracking-tight">
                              {meta.label}
                            </h4>
                            <span className="text-[9px] font-mono text-zinc-600 px-1.5 py-0.5 bg-black/50 rounded uppercase">
                              PID: {w.id.substring(0, 8)}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 font-mono italic">
                            Thread priority: normal • Status: executing
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeWidget(w.id)}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {widgets.length === 0 && (
                  <div className="h-32 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-xl bg-white/1">
                    <p className="text-xs text-zinc-600 font-medium">
                      NO ACTIVE SUBPROCESSES DETECTED
                    </p>
                    <p className="text-[10px] text-zinc-700 mt-1 uppercase tracking-tighter">
                      Initialize blueprint to begin execution
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <footer className="px-6 py-3 border-t border-white/5 bg-black/40 backdrop-blur-md">
          <div className="flex items-center justify-end text-[10px] text-zinc-600 font-mono tracking-tighter">
            <div className="flex gap-4">
              <span>MEM: {Math.floor(Math.random() * 200 + 400)}MB</span>
              <span>CPU: {Math.floor(Math.random() * 5 + 1)}%</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default ControlPanel;
