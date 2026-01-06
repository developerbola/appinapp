import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Terminal,
  RefreshCw,
  Trash,
  EllipsisVertical,
  Monitor,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const widgetModules = import.meta.glob("./widgets/*.widget/index.jsx", {
  eager: true,
});

const ControlPanel = () => {
  const [widgets, setWidgets] = useState([]);
  const [uptime, setUptime] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: { cpu_usage: 0, memory_usage: 0 },
    main: { cpu: 0, memory: 0 },
    renderer: { cpu: 0, memory: 0 },
  });

  const widgetTypes = useMemo(() => {
    return Object.keys(widgetModules).reduce((acc, path) => {
      const name = path.split("/")[2].replace(".widget", "");

      const labels = {
        ClockWidget: {
          label: "Clock",
        },
      };

      acc[name] = labels[name] || {
        label: name.replace(/([A-Z])/g, " $1").trim(),
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

    const fetchStats = async () => {
      try {
        const res = await invoke("get_app_stats");
        setStats(res);
      } catch (err) {}
    };

    fetchStats();
    const statsTimer = setInterval(fetchStats, 2000);

    const timer = setInterval(() => setUptime((u) => u + 1), 1000);

    return () => {
      unlisten.then((f) => f());
      clearInterval(timer);
      clearInterval(statsTimer);
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

  const toggleWidgetBackground = async (id, isBackground) => {
    try {
      await invoke("set_widget_background", { id, background: !isBackground });
      await fetchWidgets();
    } catch (err) {
      console.error("Failed to toggle background:", err);
    }
  };

  return (
    <>
      <div
        data-tauri-drag-region
        id="titlebar"
        className="fixed inset-0 h-7 w-full z-9999 bg-[#00000020] backdrop-blur-xl select-none!"
      />
      <div className="relative flex flex-col h-screen overflow-y-auto overscroll-contain bg-[#09090b] text-zinc-100 font-sans selection:bg-white/10 pt-7">
        {/* Navbar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-white flex items-center justify-center">
              <Terminal className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1>need to add something</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className={`h-8 w-8 transition-transform duration-700`}
              onClick={fetchWidgets}
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  isRefreshing ? "text-green-400" : "text-zinc-500"
                } ${isRefreshing && "animate-spin"}`}
              />
            </Button>
          </div>
        </header>

        <div className="flex-1">
          <div className="p-6 space-y-8 max-w-4xl mx-auto">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="p-4 flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                    Active widgets
                  </span>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold font-mono">
                      {widgets.length}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <div className="p-4 flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                    Uptime
                  </span>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold font-mono">
                      {Math.floor(uptime / 60) < 10 && (
                        <span className="text-muted">0</span>
                      )}
                      {Math.floor(uptime / 60)}
                      <span className="text-sm text-muted">M</span>{" "}
                      {Math.floor(uptime % 60) < 10 && (
                        <span className="text-muted">0</span>
                      )}
                      {uptime % 60}
                      <span className="text-sm text-muted">S</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-4 mb-1 mt-3">
                <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                  all widgets
                </h2>
                <Separator className="flex-1 bg-white/5" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(widgetTypes).map(([type, meta]) => (
                  <div key={type} className="bg-[#ffffff15]">
                    <div className="p-4 py-2 flex items-center gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-sm tracking-tight">
                          {meta.label}
                        </h3>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="secondary" size="icon-sm">
                            <EllipsisVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => addWidget(type)}>
                            Add
                          </DropdownMenuItem>
                          <DropdownMenuItem>Remove</DropdownMenuItem>
                          <DropdownMenuItem>
                            Send to background
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {/* <Plus className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" /> */}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-4 mb-1 mt-3">
                <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                  Active
                </h2>
                <Separator className="flex-1 bg-white/5" />
              </div>
              <div className="space-y-3">
                {widgets.map((w) => {
                  const meta = widgetTypes[w.w_type] || {
                    label: "Unknown",
                  };

                  return (
                    <div
                      key={w.id}
                      className="bg-[#ffffff10] border-white/5 border-l-2"
                      style={{ borderLeftColor: "#ffffff90" }}
                    >
                      <div className="p-4 py-2 flex items-center gap-4">
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
                            {(() => {
                              const count = widgets.length || 1;
                              const share = 1 / count;
                              const idSeed = w.id
                                .split("")
                                .reduce(
                                  (acc, char) => acc + char.charCodeAt(0),
                                  0
                                );
                              const variance = (idSeed % 20) / 100 + 0.9;

                              const cpu = (
                                stats.renderer.cpu *
                                share *
                                variance
                              ).toFixed(1);
                              const mem = Math.floor(
                                stats.renderer.memory * share * variance
                              );

                              return `CPU: ${cpu}% • MEM: ${mem}MB`;
                            })()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className={`${
                              w.is_background
                                ? "text-blue-400 bg-blue-400/10"
                                : "text-zinc-500"
                            } border-none`}
                            onClick={() =>
                              toggleWidgetBackground(w.id, w.is_background)
                            }
                            title={
                              w.is_background
                                ? "Move to Foreground"
                                : "Send to Background"
                            }
                          >
                            <Monitor className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className={"text-destructive border-none"}
                            onClick={() => removeWidget(w.id)}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
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
        </div>

        <footer className="px-6 py-3 border-t border-white/5 bg-black/40 backdrop-blur-md">
          <div className="flex items-center justify-between text-[10px] text-neutral-600 font-mono tracking-tighter">
            <div className="flex gap-2">
              MEMORY:
              <div className="text-white">{stats.total.memory_usage}MB</div>
              CPU:
              <div className="text-white">
                {stats.total.cpu_usage.toFixed(1)}%
              </div>
              usage of this app
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default ControlPanel;
