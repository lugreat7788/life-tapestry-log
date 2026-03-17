import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Trash2, Flag } from "lucide-react";
import { getTodos, saveTodos, type TodoItem } from "@/lib/store";
import { MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRIORITY_COLORS = {
  low: "text-muted-foreground",
  medium: "text-amber-500",
  high: "text-destructive",
};

export default function TodoPage() {
  const [todos, setTodos] = useState<TodoItem[]>(() => getTodos());
  const [newText, setNewText] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const addTodo = () => {
    if (!newText.trim()) return;
    const newTodo: TodoItem = {
      id: Date.now().toString(),
      text: newText.trim(),
      priority: "medium",
      completed: false,
      points: 5,
      createdAt: new Date().toISOString(),
    };
    const updated = [newTodo, ...todos];
    setTodos(updated);
    saveTodos(updated);
    setNewText("");
    setShowAdd(false);
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setTodos(updated);
    saveTodos(updated);
  };

  const deleteTodo = (id: string) => {
    const updated = todos.filter((t) => t.id !== id);
    setTodos(updated);
    saveTodos(updated);
  };

  const pending = todos.filter((t) => !t.completed);
  const completed = todos.filter((t) => t.completed);

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-display font-bold text-foreground">待办</h1>
        <Button
          size="sm"
          onClick={() => setShowAdd(!showAdd)}
          className="rounded-full"
        >
          <Plus className="w-4 h-4 mr-1" />
          添加
        </Button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
              <Input
                placeholder="添加新待办..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTodo()}
                autoFocus
              />
              <div className="flex gap-2">
                <Button onClick={addTodo} size="sm">
                  确认
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdd(false)}
                >
                  取消
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending */}
      {pending.length === 0 && !showAdd && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">暂无待办事项</p>
          <p className="text-muted-foreground text-xs mt-1">
            点击上方"添加"按钮创建
          </p>
        </div>
      )}

      <div className="space-y-2">
        <AnimatePresence>
          {pending.map((todo) => (
            <motion.div
              key={todo.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="bg-card rounded-xl shadow-card p-4 flex items-center gap-3"
            >
              <button
                onClick={() => toggleTodo(todo.id)}
                className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 hover:border-primary/50 transition-colors shrink-0"
              />
              <span className="flex-1 text-sm">{todo.text}</span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            已完成 ({completed.length})
          </h2>
          <div className="space-y-2">
            {completed.map((todo) => (
              <motion.div
                key={todo.id}
                layout
                className="bg-card rounded-xl shadow-card p-4 flex items-center gap-3 opacity-60"
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0"
                >
                  <Check className="w-3.5 h-3.5 text-primary-foreground" />
                </button>
                <span className="flex-1 text-sm line-through text-muted-foreground">
                  {todo.text}
                </span>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
