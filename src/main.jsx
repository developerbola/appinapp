import React from "react";
import ReactDOM from "react-dom/client";
import * as Lucide from "lucide-react";
import App from "./App";

window.React = React;
window.Lucide = Lucide;

document.documentElement.classList.add("dark");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
