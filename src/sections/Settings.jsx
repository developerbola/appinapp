import FolderSelect from "@/components/FolderSelect";
import LaunchLogin from "@/components/LaunchLogin";

const Settings = () => {
  return (
    <div>
      <div className="p-6 pt-4 flex flex-col gap-2 max-w-4xl mx-auto">
        <div>
          <LaunchLogin />
        </div>
        <div>
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            Widgets folder
          </span>
          <FolderSelect />
        </div>
      </div>
    </div>
  );
};

export default Settings;
