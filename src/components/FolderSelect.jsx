import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FolderInput, Loader2 } from "lucide-react";
import { openPath } from "@tauri-apps/plugin-opener";

export default function FolderSelect() {
  const [folderPath, setFolderPath] = useState("");
  const [isOpening, setIsOpening] = useState(false);

  const selectFolder = async () => {
    try {
      const path = await open({
        directory: true,
        multiple: false,
      });

      if (path && typeof path === "string") {
        setFolderPath(path);
      }
    } catch (error) {
      console.error("Failed to select folder:", error);
    }
  };

  const openFolder = async () => {
    if (!folderPath || isOpening) return;
    
    setIsOpening(true);
    try {
      await openPath(folderPath);
    } catch (error) {
      console.error("Failed to open folder:", error);
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <Input
        value={folderPath}
        placeholder="Select folder..."
        readOnly
        onClick={selectFolder}
        className="px-2 pt-1 h-7 cursor-pointer text-[13px] bg-[#ffffff10]!"
      />
      <button
        className="cursor-pointer h-7 w-8 rounded-sm flex items-center justify-center border border-border"
        onClick={openFolder}
        disabled={!folderPath || isOpening}
      >
        {isOpening ? (
          <Loader2 className="size-4 text-[#ffffff90] animate-spin" />
        ) : (
          <FolderInput className="size-4 text-[#ffffff90]" />
        )}
      </button>
    </div>
  );
}