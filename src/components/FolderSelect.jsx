import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function FolderSelect() {
  const [folderPath, setFolderPath] = useState("");

  const selectFolder = async () => {
    const path = await open({
      directory: true,
      multiple: false,
    });
    if (typeof path === "string") {
      setFolderPath(path);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <Input
        value={folderPath}
        placeholder="Select folder..."
        readOnly
        onClick={selectFolder}
        className="px-2 pt-0.6 h-7 cursor-pointer text-[13px]"
      />
    </div>
  );
}
