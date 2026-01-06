import { useState } from "react";

const Todo = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, newTask.trim()]);
      setNewTask("");
    }
  };

  return (
    <div
      className="widget"
      style={{
        pointerEvents: "auto",
        background: "rgba(10, 10, 10, 0.8)",
        color: "#fff",
        padding: "20px",
        borderRadius: "20px",
        width: "300px",
        display: "flex",
        flexDirection: "column",
        gap: "15px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600 }}>
          Tasks
        </h1>
        <span style={{ fontSize: "0.8rem", opacity: 0.5 }}>
          {tasks.length} total
        </span>
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={newTask}
          placeholder="Add a task..."
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            padding: "8px 12px",
            color: "#fff",
            fontSize: "0.9rem",
            outline: "none",
          }}
        />
        <button
          onClick={addTask}
          style={{
            background: "#fff",
            color: "#000",
            border: "none",
            borderRadius: "10px",
            padding: "8px 15px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </div>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {tasks.map((task, index) => (
          <li
            key={index}
            style={{
              background: "rgba(255,255,255,0.03)",
              padding: "10px 15px",
              borderRadius: "10px",
              fontSize: "0.9rem",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {task}
          </li>
        ))}
        {tasks.length === 0 && (
          <li
            style={{
              textAlign: "center",
              opacity: 0.3,
              fontSize: "0.8rem",
              padding: "20px 0",
            }}
          >
            No tasks yet
          </li>
        )}
      </ul>
    </div>
  );
};

export const windowTop = 100;
export const windowLeft = 500;
export const isBackground = false;

export default Todo;
