import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Trash2, Target, Calendar, Flag, FolderPlus, Pencil, X, Folder } from "lucide-react";
import { getTodos, addTodo as addTodoDb, updateTodo, deleteTodo as deleteTodoDb, getGoals, addGoal as addGoalDb, updateGoalStatus, deleteGoal as deleteGoalDb, getTodoCollections, addTodoCollection, renameTodoCollection, deleteTodoCollection } from "@/lib/supabase-store";
import type { TodoItem, GoalItem, TodoCollection } from "@/lib/store-types";
import { MODULES } from "@/lib/modules";
import { useAuth } from "@/hooks/useAuth";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const PRIORITY_COLORS = {
  low: "text-muted-foreground",
  medium: "text-amber-500",
  high: "text-destructive",
};

const PRIORITY_LABELS = { low: "低", medium: "中", high: "高" };

const STATUS_LABELS = { not_started: "未开始", in_progress: "进行中", completed: "已完成" };
const STATUS_COLORS = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-module-health text-module-health-fg",
};

export default function GoalsPage() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [collections, setCollections] = useState<TodoCollection[]>([]);
  const [activeCollection, setActiveCollection] = useState<string | null>(null); // null = "全部"
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState<"low" | "medium" | "high">("medium");
  const [newTodoDueDate, setNewTodoDueDate] = useState("");
  const [newTodoModule, setNewTodoModule] = useState("");
  const [newTodoCollection, setNewTodoCollection] = useState("");
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDesc, setNewGoalDesc] = useState("");
  const [newGoalType, setNewGoalType] = useState<"short_term" | "long_term">("short_term");
  const [newGoalDate, setNewGoalDate] = useState("");

  // Collection management state
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [editingCollection, setEditingCollection] = useState<TodoCollection | null>(null);
  const [editCollectionName, setEditCollectionName] = useState("");

  const loadData = async () => {
    if (!user) return;
    const [t, g, c] = await Promise.all([getTodos(user.id), getGoals(user.id), getTodoCollections(user.id)]);
    setTodos(t);
    setGoals(g);
    setCollections(c);
  };

  useEffect(() => { loadData(); }, [user]);

  const handleAddTodo = async () => {
    if (!newTodoText.trim() || !user) return;
    await addTodoDb(user.id, {
      text: newTodoText.trim(),
      dueDate: newTodoDueDate || undefined,
      priority: newTodoPriority,
      moduleTag: newTodoModule || undefined,
      collectionId: newTodoCollection || undefined,
      completed: false,
      points: 5,
    });
    setNewTodoText(""); setNewTodoDueDate(""); setNewTodoModule(""); setNewTodoCollection(""); setShowAddTodo(false);
    await loadData();
  };

  const handleToggleTodo = async (id: string, completed: boolean) => {
    await updateTodo(id, { completed: !completed });
    await loadData();
  };

  const handleDeleteTodo = async (id: string) => {
    await deleteTodoDb(id);
    await loadData();
  };

  const handleAddGoal = async () => {
    if (!newGoalTitle.trim() || !user) return;
    await addGoalDb(user.id, {
      title: newGoalTitle.trim(),
      description: newGoalDesc.trim(),
      targetDate: newGoalDate || undefined,
      type: newGoalType,
      status: "not_started",
      points: newGoalType === "long_term" ? 20 : 10,
    });
    setNewGoalTitle(""); setNewGoalDesc(""); setNewGoalDate(""); setShowAddGoal(false);
    await loadData();
  };

  const handleUpdateGoalStatus = async (id: string, status: string) => {
    await updateGoalStatus(id, status);
    await loadData();
  };

  const handleDeleteGoal = async (id: string) => {
    await deleteGoalDb(id);
    await loadData();
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim() || !user) return;
    await addTodoCollection(user.id, newCollectionName.trim());
    setNewCollectionName("");
    setShowNewCollection(false);
    await loadData();
  };

  const handleRenameCollection = async () => {
    if (!editingCollection || !editCollectionName.trim()) return;
    await renameTodoCollection(editingCollection.id, editCollectionName.trim());
    setEditingCollection(null);
    setEditCollectionName("");
    await loadData();
  };

  const handleDeleteCollection = async (id: string) => {
    await deleteTodoCollection(id);
    if (activeCollection === id) setActiveCollection(null);
    await loadData();
  };

  // Filter todos by active collection
  const filteredTodos = activeCollection
    ? todos.filter((t) => t.collectionId === activeCollection)
    : todos;

  const pendingTodos = filteredTodos.filter((t) => !t.completed);
  const completedTodos = filteredTodos.filter((t) => t.completed);
  const shortTermGoals = goals.filter((g) => g.type === "short_term");
  const longTermGoals = goals.filter((g) => g.type === "long_term");

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold text-foreground mb-5">目标与待办</h1>

      <Tabs defaultValue="todo" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="todo" className="flex-1">待办事项</TabsTrigger>
          <TabsTrigger value="goals" className="flex-1">目标追踪</TabsTrigger>
        </TabsList>

        <TabsContent value="todo">
          <div className="mt-4">
            {/* Collection tabs */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setActiveCollection(null)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                  activeCollection === null
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                )}
              >
                全部
              </button>
              {collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => setActiveCollection(col.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 group",
                    activeCollection === col.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  <Folder className="w-3 h-3" />
                  {col.name}
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingCollection(col); setEditCollectionName(col.name); }}
                    className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-foreground"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </button>
              ))}
              <button
                onClick={() => setShowNewCollection(true)}
                className="px-2 py-1.5 rounded-full text-xs text-muted-foreground hover:bg-accent transition-colors"
                title="新建待办集"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </div>

            {/* New collection inline input */}
            <AnimatePresence>
              {showNewCollection && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
                  <div className="flex items-center gap-2 bg-card rounded-xl shadow-card p-3">
                    <Input
                      placeholder="待办集名称..."
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateCollection()}
                      autoFocus
                      className="h-8 text-sm"
                    />
                    <Button size="sm" onClick={handleCreateCollection} className="h-8 px-3">创建</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowNewCollection(false); setNewCollectionName(""); }} className="h-8 px-2">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={() => setShowAddTodo(!showAddTodo)} className="rounded-full">
                <Plus className="w-4 h-4 mr-1" />添加
              </Button>
            </div>

            <AnimatePresence>
              {showAddTodo && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
                  <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
                    <Input placeholder="添加新待办..." value={newTodoText} onChange={(e) => setNewTodoText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddTodo()} autoFocus />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="date" value={newTodoDueDate} onChange={(e) => setNewTodoDueDate(e.target.value)} />
                      <Select value={newTodoPriority} onValueChange={(v) => setNewTodoPriority(v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">低优先级</SelectItem>
                          <SelectItem value="medium">中优先级</SelectItem>
                          <SelectItem value="high">高优先级</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={newTodoModule} onValueChange={setNewTodoModule}>
                        <SelectTrigger><SelectValue placeholder="关联模块（可选）" /></SelectTrigger>
                        <SelectContent>
                          {MODULES.map((m) => (
                            <SelectItem key={m.key} value={m.key}>{m.icon} {m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={newTodoCollection} onValueChange={setNewTodoCollection}>
                        <SelectTrigger><SelectValue placeholder="待办集（可选）" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">无</SelectItem>
                          {collections.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddTodo} size="sm">确认</Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddTodo(false)}>取消</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {pendingTodos.length === 0 && !showAddTodo && (
              <div className="text-center py-12"><p className="text-muted-foreground text-sm">暂无待办事项</p></div>
            )}

            <div className="space-y-2">
              <AnimatePresence>
                {pendingTodos.map((todo) => {
                  const mod = todo.moduleTag ? MODULES.find(m => m.key === todo.moduleTag) : null;
                  const col = todo.collectionId ? collections.find(c => c.id === todo.collectionId) : null;
                  return (
                    <motion.div key={todo.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} className="bg-card rounded-xl shadow-card p-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleToggleTodo(todo.id, todo.completed)} className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 hover:border-primary/50 transition-colors shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm">{todo.text}</span>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Flag className={cn("w-3 h-3", PRIORITY_COLORS[todo.priority])} />
                            <span className={cn("text-xs", PRIORITY_COLORS[todo.priority])}>{PRIORITY_LABELS[todo.priority]}</span>
                            {todo.dueDate && <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{todo.dueDate}</span>}
                            {mod && <span className={cn("text-xs px-1.5 py-0.5 rounded-full", mod.bgClass, mod.fgClass)}>{mod.icon} {mod.name}</span>}
                            {col && <span className="text-xs px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground flex items-center gap-0.5"><Folder className="w-3 h-3" />{col.name}</span>}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteTodo(todo.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {completedTodos.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">已完成 ({completedTodos.length})</h3>
                <div className="space-y-2">
                  {completedTodos.map((todo) => (
                    <motion.div key={todo.id} layout className="bg-card rounded-xl shadow-card p-4 flex items-center gap-3 opacity-60">
                      <button onClick={() => handleToggleTodo(todo.id, todo.completed)} className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      </button>
                      <span className="flex-1 text-sm line-through text-muted-foreground">{todo.text}</span>
                      <button onClick={() => handleDeleteTodo(todo.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="goals">
          <div className="mt-4">
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={() => setShowAddGoal(!showAddGoal)} className="rounded-full">
                <Plus className="w-4 h-4 mr-1" />添加目标
              </Button>
            </div>

            <AnimatePresence>
              {showAddGoal && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
                  <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
                    <Input placeholder="目标名称..." value={newGoalTitle} onChange={(e) => setNewGoalTitle(e.target.value)} autoFocus />
                    <Textarea placeholder="目标描述（可选）" value={newGoalDesc} onChange={(e) => setNewGoalDesc(e.target.value)} className="min-h-[80px] resize-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={newGoalType} onValueChange={(v) => setNewGoalType(v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short_term">近期目标 (+10分)</SelectItem>
                          <SelectItem value="long_term">远期目标 (+20分)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="date" value={newGoalDate} onChange={(e) => setNewGoalDate(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddGoal} size="sm">确认</Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddGoal(false)}>取消</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-primary" />近期目标</h3>
              {shortTermGoals.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-6">暂无近期目标</p>
              ) : (
                <div className="space-y-2">
                  {shortTermGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} onUpdateStatus={handleUpdateGoalStatus} onDelete={handleDeleteGoal} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-module-goals-fg" />远期目标</h3>
              {longTermGoals.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-6">暂无远期目标</p>
              ) : (
                <div className="space-y-2">
                  {longTermGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} onUpdateStatus={handleUpdateGoalStatus} onDelete={handleDeleteGoal} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Rename collection dialog */}
      <Dialog open={!!editingCollection} onOpenChange={(open) => { if (!open) setEditingCollection(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>编辑待办集</DialogTitle>
          </DialogHeader>
          <Input
            value={editCollectionName}
            onChange={(e) => setEditCollectionName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRenameCollection()}
            placeholder="待办集名称"
            autoFocus
          />
          <DialogFooter className="flex-row gap-2">
            <Button onClick={handleRenameCollection} size="sm">保存</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { if (editingCollection) handleDeleteCollection(editingCollection.id); }}
            >
              <Trash2 className="w-4 h-4 mr-1" />删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalCard({ goal, onUpdateStatus, onDelete }: { goal: GoalItem; onUpdateStatus: (id: string, status: string) => void; onDelete: (id: string) => void }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("bg-card rounded-xl shadow-card p-4", goal.status === "completed" && "opacity-60")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className={cn("font-medium text-sm", goal.status === "completed" && "line-through text-muted-foreground")}>{goal.title}</h4>
          {goal.description && <p className="text-xs text-muted-foreground mt-1">{goal.description}</p>}
          <div className="flex items-center gap-2 mt-2">
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[goal.status])}>{STATUS_LABELS[goal.status]}</span>
            <span className="text-xs text-muted-foreground">+{goal.points}分</span>
            {goal.targetDate && <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{goal.targetDate}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Select value={goal.status} onValueChange={(v) => onUpdateStatus(goal.id, v)}>
            <SelectTrigger className="h-7 text-xs w-20 px-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="not_started">未开始</SelectItem>
              <SelectItem value="in_progress">进行中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
            </SelectContent>
          </Select>
          <button onClick={() => onDelete(goal.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    </motion.div>
  );
}
