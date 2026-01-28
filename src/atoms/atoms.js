import { atomWithStorage } from "jotai/utils";

export const widgetFolderAtom = atomWithStorage(
  "widget-folder",
  "/Users/devbola/Documents/appinapp/",
);

export const activeWidgetsAtom = atomWithStorage("active-widgets", []);
