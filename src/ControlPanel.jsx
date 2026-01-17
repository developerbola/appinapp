import { useState, useEffect, useMemo, Activity } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ask } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  RefreshCw,
  Trash,
  EllipsisVertical,
  CirclePlus,
  CircleMinus,
  Settings as SettingsIcon,
  LayoutDashboard,
  Code,
  SquareMousePointer,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAtom } from "jotai";
import { widgetFolderAtom } from "@/atoms/atoms";
import WindowSettings from "./components/WindowSettings";
import Uptime from "./components/Uptime";
import Settings from "./sections/Settings";
import Gallery from "./sections/Gallery";

const ControlPanel = () => {
  const [widgets, setWidgets] = useState([]);
  const [widgetFolder] = useAtom(widgetFolderAtom);
  const [availableWidgetTypes, setAvailableWidgetTypes] = useState([]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: { cpu_usage: 0, memory_usage: 0 },
    main: { cpu: 0, memory: 0 },
    renderer: { cpu: 0, memory: 0 },
  });
  const [active, setActive] = useState("control");

  // Build widget types from scanned folder
  const widgetTypes = useMemo(() => {
    return availableWidgetTypes.reduce((acc, type) => {
      acc[type] = {
        label: type.replace(/([A-Z])/g, " $1").trim(),
      };
      return acc;
    }, {});
  }, [availableWidgetTypes]);

  // Scan widget folder for available widgets
  const scanWidgetFolder = async () => {
    try {
      const types = await invoke("scan_widget_folder", {
        folderPath: widgetFolder,
      });
      setAvailableWidgetTypes(types);
    } catch (err) {
      console.error("Failed to scan widget folder:", err);
      setAvailableWidgetTypes([]);
    }
  };

  const fetchWidgets = async () => {
    setIsRefreshing(true);
    try {
      const list = await invoke("get_widgets", { folderPath: widgetFolder });
      setWidgets(list);
    } catch (err) {
      console.error("Failed to fetch widgets:", err);
      // Fallback without folder path
      try {
        const list = await invoke("get_widgets");
        setWidgets(list);
      } catch (fallbackErr) {
        console.error("Fallback also failed:", fallbackErr);
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    scanWidgetFolder();
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

    return () => {
      unlisten.then((f) => f());
      clearInterval(statsTimer);
    };
  }, [widgetFolder]);

  const addWidget = async (type) => {
    try {
      await invoke("add_widget", {
        wType: type,
        folderPath: widgetFolder,
        x: 100,
        y: 100,
        width: 300,
        height: 200,
      });
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
  const deleteWidgetSource = async (type) => {
    const confirmed = await ask(
      `Are you sure you want to permanently delete the widget "${type}"? \n\nThis will remove the .widget folder from your disk. This action cannot be undone.`,
      {
        title: "Delete Widget Source",
        kind: "warning",
      },
    );

    if (confirmed) {
      try {
        await invoke("delete_widget_source", {
          folderPath: widgetFolder,
          wType: type,
        });
        await scanWidgetFolder();
      } catch (err) {
        console.error("Failed to delete widget source:", err);
      }
    }
  };

  const edit = async (type) => {
    try {
      const base = widgetFolder.replace(/\/$/, "");
      const path = `${base}/${type}.widget`;

      await invoke("execute_command", {
        command: `if [ -f "${path}/index.js" ]; then open "${path}/index.js"; elif [ -f "${path}/index.jsx" ]; then open "${path}/index.jsx"; else open "${path}"; fi`,
        workDir: null,
      });
    } catch (err) {
      console.error("Failed to open widget for editing:", err);
    }
  };

  return (
    <>
      <div
        data-tauri-drag-region
        id="titlebar"
        className="fixed inset-0 h-7 w-full z-9999 backdrop-blur-xl select-none!"
      />
      <div className="relative flex flex-col h-screen overflow-y-auto overscroll-contain bg-[#0b0b0b] text-zinc-100 font-sans pt-7 hide-scrollbar">
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#ffffff12]">
          <div className="flex items-center gap-3">
            <h1 className="text-xl">Control</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={"ghost"}
              size="icon"
              className={`size-8 duration-50 ${
                active == "gallery" && "bg-border"
              }`}
              onClick={() =>
                setActive((prev) => (prev == "gallery" ? "control" : "gallery"))
              }
            >
              <LayoutDashboard className={"size-4 opacity-70"} />
            </Button>
            <Button
              variant={"ghost"}
              size="icon"
              className={`size-8 duration-50 ${
                active == "settings" && "bg-border"
              }`}
              onClick={() =>
                setActive((prev) =>
                  prev == "settings" ? "control" : "settings",
                )
              }
            >
              <SettingsIcon className={"size-4 opacity-70"} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`size-8 ${
                isRefreshing
                  ? "bg-[#00c95030] border-[#00c95060] text-green-400"
                  : "text-[#ffffff90]"
              }`}
              onClick={() => {
                scanWidgetFolder();
                fetchWidgets();
              }}
            >
              <RefreshCw
                className={`size-4 ${
                  isRefreshing ? "text-green-400" : "text-zinc-400"
                } ${isRefreshing && "animate-spin"}`}
              />
            </Button>
          </div>
        </div>

        <Activity mode={active !== "gallery" ? "hidden" : "visible"}>
          <Gallery />
        </Activity>

        <Activity mode={active !== "settings" ? "hidden" : "visible"}>
          <Settings />
        </Activity>

        <Activity mode={active !== "control" ? "hidden" : "visible"}>
          <div>
            <div className="p-6 pt-1 space-y-8 max-w-4xl mx-auto">
              <div className="flex gap-2">
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
                  <Uptime />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-4 mb-1 mt-3">
                  <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                    all widgets
                  </h2>
                  <Separator className="flex-1 bg-white/5" />
                </div>
                {availableWidgetTypes.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-xl bg-white/1">
                    <p className="text-xs text-zinc-600 font-medium">
                      NO WIDGETS FOUND
                    </p>
                    <p className="text-[12px] text-zinc-700 mt-1 tracking-tighter">
                      Check widget folder: {widgetFolder}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    {Object.entries(widgetTypes).map(([type, meta]) => (
                      <div
                        key={type}
                        className="bg-[#ffffff10] border border-[#ffffff05] border-l-2 border-l-[#ffffff40]"
                      >
                        <div className="pl-4 pr-2 py-1 flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-sm tracking-tight">
                              {meta.label}
                            </h3>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className={"opacity-60"}
                              >
                                <EllipsisVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {[
                                {
                                  label: "Add",
                                  icon: <CirclePlus className="w-4 h-4" />,
                                  onClick: () => addWidget(type),
                                },
                                {
                                  label: "Delete",
                                  icon: <Trash className="w-4 h-4" />,
                                  onClick: () => deleteWidgetSource(type),
                                  danger: true,
                                },
                                {
                                  label: "Edit",
                                  icon: <Code className="w-4 h-4" />,
                                  onClick: () => edit(type),
                                  danger: true,
                                },
                              ].map((item) => (
                                <DropdownMenuItem
                                  key={item.label}
                                  onClick={item.onClick}
                                  className="flex items-center justify-between gap-3 menuItem"
                                >
                                  <span>{item.label}</span>
                                  {item.icon}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-4 mb-1 mt-3">
                  <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                    Active
                  </h2>
                  <Separator className="flex-1 bg-white/5" />
                </div>
                <div className="flex flex-col gap-1">
                  {widgets.map((w) => {
                    const meta = widgetTypes[w.w_type] || {
                      label: "Unknown",
                    };

                    return (
                      <div
                        key={w.id}
                        className="bg-[#ffffff10] border-l-2"
                        style={{ borderLeftColor: "#ffffff90" }}
                      >
                        <div className="p-4 py-2 pr-2 flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold tracking-tight w-fill max-w-[65%] whitespace-nowrap overflow-hidden">
                                {meta.label}
                              </h4>
                              <span className="text-[9px] font-mono text-zinc-600 px-1.5 py-0.5 bg-[#00000020] rounded uppercase">
                                PID: {w.id.substring(0, 8)}
                              </span>
                            </div>
                            <p className="text-[9px] text-[#ffffff30] font-mono italic">
                              {(() => {
                                const count = widgets.length || 1;
                                const share = 1 / count;
                                const idSeed = w.id
                                  .split("")
                                  .reduce(
                                    (acc, char) => acc + char.charCodeAt(0),
                                    0,
                                  );
                                const variance = (idSeed % 20) / 100 + 0.9;

                                const cpu = (
                                  stats.renderer.cpu *
                                  share *
                                  variance
                                ).toFixed(1);
                                const mem = Math.floor(
                                  stats.renderer.memory * share * variance,
                                );

                                return `CPU: ${cpu}% • MEM: ${mem}MB`;
                              })()}
                            </p>
                          </div>
                          <div className="flex">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className={"text-destructive border-none"}
                              onClick={() => removeWidget(w.id)}
                            >
                              <CircleMinus className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className={"border-none text-[#ffffff90]"}
                              onClick={() => {
                                invoke("open_devtools", { id: w.id });
                              }}
                            >
                              <SquareMousePointer className="w-4 h-4" />
                            </Button>
                            <WindowSettings w={w} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {widgets.length === 0 && (
                    <div className="h-32 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-xl bg-white/1">
                      <p className="text-xs text-zinc-600 font-medium">
                        NO ACTIVE PROCESSES
                      </p>
                      <p className="text-[12px] text-zinc-700 mt-1 tracking-tighter">
                        Add widgets to begin
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-[#ffffff10] bg-black/40 backdrop-blur-md">
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
            </div>
          </div>
        </Activity>
      </div>
    </>
  );
};

export default ControlPanel;
