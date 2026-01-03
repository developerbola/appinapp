import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus } from "lucide-react";

const TodoWidget = () => {
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem("todos");
    return saved ? JSON.parse(saved) : [];
  });
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    if (inputValue.trim()) {
      setTodos([
        ...todos,
        { id: Date.now(), text: inputValue, completed: false },
      ]);
      setInputValue("");
    }
  };

  const toggleTodo = (id) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      addTodo();
    }
  };

  return (
    <Card className="widget w-[300px] bg-black/60 backdrop-blur-xl border-white/10 text-white overflow-hidden shadow-2xl">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold tracking-wider uppercase opacity-70">
          Tasks
        </CardTitle>
        <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full font-mono">
          {todos.filter((t) => !t.completed).length} Pending
        </span>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="flex gap-2 mb-4">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="New task..."
            className="h-8 bg-white/5 border-white/10 text-xs focus-visible:ring-1 focus-visible:ring-white/20"
          />
          <Button
            onClick={addTodo}
            size="icon"
            className="h-8 w-8 bg-white/10 hover:bg-white/20 text-white border-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-[250px] pr-4">
          <div className="space-y-2">
            {todos.length === 0 && (
              <p className="text-center text-[10px] opacity-30 py-10 font-medium">
                NO PENDING TASKS
              </p>
            )}
            {todos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center gap-3 group bg-white/5 p-2 rounded-md border border-transparent hover:border-white/5 transition-all"
              >
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => toggleTodo(todo.id)}
                  className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-black"
                />
                <span
                  className={`text-xs flex-1 truncate font-medium transition-all ${
                    todo.completed ? "line-through opacity-30" : "opacity-90"
                  }`}
                >
                  {todo.text}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTodo(todo.id)}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TodoWidget;
