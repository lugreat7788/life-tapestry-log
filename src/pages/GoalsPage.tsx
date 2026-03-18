import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Trash2, Target, Calendar, Flag } from "lucide-react";
import { getTodos, saveTodos, getGoals, saveGoals, type TodoItem, type GoalItem } from "@/lib/store";
import { MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const PRIORITY_COLORS = {
  low: "text-muted-foreground",
  medium: "text-amber-500",
  high: "text-destructive",
};

const PRIORITY_LABELS = {
  low: "低",
  medium: "中",
  high: "高",
};

const STATUS_LABELS = {
  not_started: "未开始",
  in_progress: "进行中",
  completed: "已完成",
};

const STATUS_COLORS = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-module-health text-module-health-fg",
};

export default function GoalsPage() {
  const [todos, setTodos] = useState<TodoItem[]>(() => getTodos());
  const [goals, setGoals] = useState<GoalItem[]>(() => getGoals());
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState<"low" | "medium" | "high">("medium");
  const [newTodoDueDate, setNewTodoDueDate] = useState("");
  const [newTodoModule, setNewTodoModule] = useState("");
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDesc, setNewGoalDesc] = useState("");
  const [newGoalType, setNewGoalType] = useState<"short_term" | "long_term">("short_term");
  const [newGoalDate, setNewGoalDate] = useState("");

  // Todo actions
  const addTodo = () => {
    if (!newTodoText.trim()) return;
    const newTodo: TodoItem = {
      id: Date.now().toString(),
      text: newTodoText.trim(),
      dueDate: newTodoDueDate || undefined,
      priority: newTodoPriority,
      moduleTag: newTodoModule || undefined,
      completed: false,
      points: 5,
      createdAt: new Date().toISOString(),
    };
    const updated = [newTodo, ...todos];
    setTodos(updated);
    saveTodos(updated);
    setNewTodoText("");
    setNewTodoDueDate("");
    setNewTodoModule("");
    setShowAddTodo(false);
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

  // Goal actions
  const addGoal = () => {
    if (!newGoalTitle.trim()) return;
    const newGoal: GoalItem = {
      id: Date.now().toString(),
      title: newGoalTitle.trim(),
      description: newGoalDesc.trim(),
      targetDate: newGoalDate || undefined,
      type: newGoalType,
      status: "not_started",
      points: newGoalType === "long_term" ? 20 : 10,
      createdAt: new Date().toISOString(),
    };
    const updated = [newGoal, ...goals];
    setGoals(updated);
    saveGoals(updated);
    setNewGoalTitle("");
    setNewGoalDesc("");
    setNewGoalDate("");
    setShowAddGoal(false);
  };

  const updateGoalStatus = (id: string, status: GoalItem["status"]) => {
    const updated = goals.map((g) =>
      g.id === id ? { ...g, status } : g
    );
    setGoals(updated);
    saveGoals(updated);
  };

  const deleteGoal = (id: string) => {
    const updated = goals.filter((g) => g.id !== id);
    setGoals(updated);
    saveGoals(updated);
  };

  const pendingTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);
  const shortTermGoals = goals.filter((g) => g.type === "short_term");
  const longTermGoals = goals.filter((g) => g.type === "long_term");

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold text-foreground mb-5">
        目标与待办
      </h1>

      <Tabs defaultValue="todo" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="todo" className="flex-1">待办事项</TabsTrigger>
          <TabsTrigger value="goals" className="flex-1">目标追踪</TabsTrigger>
        </TabsList>

        {/* Todo Tab */}
        <TabsContent value="todo">
          <div className="mt-4">
            <div className="flex justify-end mb-3">
              <Button
                size="sm"
                onClick={() => setShowAddTodo(!showAddTodo)}
                className="rounded-full"
              >
                <Plus className="w-4 h-4 mr-1" />
                添加
              </Button>
            </div>

            <AnimatePresence>
              {showAddTodo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
                    <Input
                      placeholder="添加新待办..."
                      value={newTodoText}
                      onChange={(e) => setNewTodoText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTodo()}
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={newTodoDueDate}
                        onChange={(e) => setNewTodoDueDate(e.target.value)}
                        placeholder="截止日期"
                      />
                      <Select value={newTodoPriority} onValueChange={(v) => setNewTodoPriority(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">低优先级</SelectItem>
                          <SelectItem value="medium">中优先级</SelectItem>
                          <SelectItem value="high">高优先级</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Select value={newTodoModule} onValueChange={setNewTodoModule}>
                      <SelectTrigger>
                        <SelectValue placeholder="关联模块（可选）" />
                      </SelectTrigger>
                      <SelectContent>
                        {MODULES.map((m) => (
                          <SelectItem key={m.key} value={m.key}>
                            {m.icon} {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button onClick={addTodo} size="sm">确认</Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddTodo(false)}>取消</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {pendingTodos.length === 0 && !showAddTodo && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">暂无待办事项</p>
              </div>
            )}

            <div className="space-y-2">
              <AnimatePresence>
                {pendingTodos.map((todo) => {
                  const mod = todo.moduleTag ? MODULES.find(m => m.key === todo.moduleTag) : null;
                  return (
                    <motion.div
                      key={todo.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="bg-card rounded-xl shadow-card p-4"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleTodo(todo.id)}
                          className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 hover:border-primary/50 transition-colors shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm">{todo.text}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Flag className={cn("w-3 h-3", PRIORITY_COLORS[todo.priority])} />
                            <span className={cn("text-xs", PRIORITY_COLORS[todo.priority])}>
                              {PRIORITY_LABELS[todo.priority]}
                            </span>
                            {todo.dueDate && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {todo.dueDate}
                              </span>
                            )}
                            {mod && (
                              <span className={cn("text-xs px-1.5 py-0.5 rounded-full", mod.bgClass, mod.fgClass)}>
                                {mod.icon} {mod.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {completedTodos.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  已完成 ({completedTodos.length})
                </h3>
                <div className="space-y-2">
                  {completedTodos.map((todo) => (
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
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals">
          <div className="mt-4">
            <div className="flex justify-end mb-3">
              <Button
                size="sm"
                onClick={() => setShowAddGoal(!showAddGoal)}
                className="rounded-full"
              >
                <Plus className="w-4 h-4 mr-1" />
                添加目标
              </Button>
            </div>

            <AnimatePresence>
              {showAddGoal && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
                    <Input
                      placeholder="目标名称..."
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                      autoFocus
                    />
                    <Textarea
                      placeholder="目标描述（可选）"
                      value={newGoalDesc}
                      onChange={(e) => setNewGoalDesc(e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={newGoalType} onValueChange={(v) => setNewGoalType(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short_term">近期目标 (+10分)</SelectItem>
                          <SelectItem value="long_term">远期目标 (+20分)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        value={newGoalDate}
                        onChange={(e) => setNewGoalDate(e.target.value)}
                        placeholder="目标日期"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={addGoal} size="sm">确认</Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddGoal(false)}>取消</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Short-term goals */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                近期目标
              </h3>
              {shortTermGoals.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-6">暂无近期目标</p>
              ) : (
                <div className="space-y-2">
                  {shortTermGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} onUpdateStatus={updateGoalStatus} onDelete={deleteGoal} />
                  ))}
                </div>
              )}
            </div>

            {/* Long-term goals */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-module-goals-fg" />
                远期目标
              </h3>
              {longTermGoals.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-6">暂无远期目标</p>
              ) : (
                <div className="space-y-2">
                  {longTermGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} onUpdateStatus={updateGoalStatus} onDelete={deleteGoal} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GoalCard({
  goal,
  onUpdateStatus,
  onDelete,
}: {
  goal: GoalItem;
  onUpdateStatus: (id: string, status: GoalItem["status"]) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-card rounded-xl shadow-card p-4",
        goal.status === "completed" && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "font-medium text-sm",
            goal.status === "completed" && "line-through text-muted-foreground"
          )}>
            {goal.title}
          </h4>
          {goal.description && (
            <p className="text-xs text-muted-foreground mt-1">{goal.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[goal.status])}>
              {STATUS_LABELS[goal.status]}
            </span>
            <span className="text-xs text-muted-foreground">
              +{goal.points}分
            </span>
            {goal.targetDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {goal.targetDate}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Select
            value={goal.status}
            onValueChange={(v) => onUpdateStatus(goal.id, v as GoalItem["status"])}
          >
            <SelectTrigger className="h-7 text-xs w-20 px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_started">未开始</SelectItem>
              <SelectItem value="in_progress">进行中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => onDelete(goal.id)}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
