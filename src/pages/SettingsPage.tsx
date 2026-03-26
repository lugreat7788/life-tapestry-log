import { useState, useMemo, useEffect } from "react";
import { CORE_MODULES, BONUS_MODULES, GOALS_MODULE, DEFAULT_CORE_MODULES, DEFAULT_BONUS_MODULES, DEFAULT_GOALS_MODULE, getCoreMaxPoints } from "@/lib/modules";
import type { Module } from "@/lib/modules";
import { getModuleConfig, saveModuleConfig, clearModuleConfig, getAllLogs, getTodos, getGoals, getEmotionRecords, getRelationshipRecords } from "@/lib/supabase-store";
import type { ModuleConfig } from "@/lib/store-types";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { User, Download, ChevronRight, ChevronDown, Plus, Trash2, RotateCcw, AlertTriangle, Pencil, LogOut, Brain, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function applyConfig(modules: Module[], config: ModuleConfig | null): Module[] {
  if (!config) return modules;
  return modules.map((mod) => {
    const cfg = config.modules[mod.key];
    if (!cfg) return mod;
    return { ...mod, name: cfg.name || mod.name, items: cfg.items.map((item) => ({ ...item })) };
  });
}

function applySingleConfig(mod: Module, config: ModuleConfig | null): Module {
  if (!config) return mod;
  const cfg = config.modules[mod.key];
  if (!cfg) return mod;
  return { ...mod, name: cfg.name || mod.name, items: cfg.items.map((item) => ({ ...item })) };
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [config, setConfig] = useState<ModuleConfig | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [editingModuleName, setEditingModuleName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newEmotionType, setNewEmotionType] = useState("");
  const [newRelationPerson, setNewRelationPerson] = useState("");

  useEffect(() => {
    if (!user) return;
    getModuleConfig(user.id).then((cfg) => {
      setConfig(cfg);
      setLoading(false);
    });
  }, [user]);

  const allModules = useMemo(() => {
    const core = applyConfig(CORE_MODULES, config);
    const bonus = applyConfig(BONUS_MODULES, config);
    const goals = applySingleConfig(GOALS_MODULE, config);
    return { core, bonus, goals };
  }, [config]);

  const coreTotal = allModules.core.reduce((sum, mod) => sum + mod.items.reduce((s, item) => s + item.points, 0), 0);

  const ensureConfig = (): ModuleConfig => {
    if (config) return JSON.parse(JSON.stringify(config));
    const newConfig: ModuleConfig = { modules: {} };
    [...CORE_MODULES, ...BONUS_MODULES, GOALS_MODULE].forEach((mod) => {
      newConfig.modules[mod.key] = { name: mod.name, items: mod.items.map((item) => ({ ...item })) };
    });
    return newConfig;
  };

  const updateConfig = async (newConfig: ModuleConfig) => {
    setConfig(newConfig);
    if (user) await saveModuleConfig(user.id, newConfig);
  };

  const handleRenameModule = (moduleKey: string, newName: string) => {
    const cfg = ensureConfig();
    if (!cfg.modules[moduleKey]) {
      const mod = [...CORE_MODULES, ...BONUS_MODULES, GOALS_MODULE].find(m => m.key === moduleKey)!;
      cfg.modules[moduleKey] = { name: mod.name, items: mod.items.map(i => ({ ...i })) };
    }
    cfg.modules[moduleKey].name = newName;
    updateConfig(cfg);
    setEditingModuleName(null);
  };

  const handleRenameItem = (moduleKey: string, itemIndex: number, newName: string) => {
    const cfg = ensureConfig();
    cfg.modules[moduleKey].items[itemIndex].name = newName;
    updateConfig(cfg);
  };

  const handleChangePoints = (moduleKey: string, itemIndex: number, points: number) => {
    const cfg = ensureConfig();
    cfg.modules[moduleKey].items[itemIndex].points = Math.max(0, points);
    updateConfig(cfg);
  };

  const handleAddItem = (moduleKey: string) => {
    const cfg = ensureConfig();
    cfg.modules[moduleKey].items.push({ id: `custom_${Date.now()}`, name: "新项目", points: 5 });
    updateConfig(cfg);
  };

  const handleDeleteItem = (moduleKey: string, itemIndex: number) => {
    const cfg = ensureConfig();
    if (cfg.modules[moduleKey].items.length <= 1) { toast.error("至少保留一个项目"); return; }
    cfg.modules[moduleKey].items.splice(itemIndex, 1);
    updateConfig(cfg);
  };

  const handleReset = async () => {
    if (user) await clearModuleConfig(user.id);
    setConfig(null);
    toast.success("已恢复默认设置");
  };

  const handleExportData = async () => {
    if (!user) return;
    try {
      toast.info("正在导出数据...");
      const [logs, todos, goals, emotionRecords, relationshipRecords] = await Promise.all([getAllLogs(user.id), getTodos(user.id), getGoals(user.id), getEmotionRecords(user.id), getRelationshipRecords(user.id)]);
      const exportData = {
        exportDate: new Date().toISOString(),
        email: user.email,
        dailyLogs: Object.entries(logs).map(([date, log]: [string, any]) => ({
          date, totalPoints: log.totalPoints,
          entries: Object.values(log.entries).map((e: any) => ({ module: e.moduleKey, item: e.itemId, completed: e.completed, notes: e.notes })),
        })),
        todos: todos.map((t) => ({ text: t.text, priority: t.priority, completed: t.completed, dueDate: t.dueDate || null, points: t.points })),
        goals: goals.map((g) => ({ title: g.title, description: g.description, type: g.type, status: g.status, targetDate: g.targetDate || null, points: g.points })),
        emotionRecords: emotionRecords.map((e) => ({ date: e.date, emotionType: e.emotionType, intensity: e.intensity, trigger: e.trigger, thoughts: e.thoughts, copingStrategy: e.copingStrategy })),
        relationshipRecords: relationshipRecords.map((r) => ({ date: r.date, person: r.person, problem: r.problem, solution: r.solution, reflection: r.reflection, status: r.status })),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lifelog-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("数据导出成功！");
    } catch { toast.error("导出失败，请重试"); }
  };

  const handleExportCSV = async () => {
    if (!user) return;
    try {
      toast.info("正在导出CSV...");
      const [logs, todos, goals] = await Promise.all([getAllLogs(user.id), getTodos(user.id), getGoals(user.id)]);

      const csvSections: string[] = [];

      // Daily logs section
      csvSections.push("=== 每日打卡记录 ===");
      csvSections.push("日期,模块,项目,已完成,得分,备注");
      Object.entries(logs).sort().forEach(([date, log]: [string, any]) => {
        Object.values(log.entries).forEach((e: any) => {
          const notes = (e.notes || "").replace(/"/g, '""');
          csvSections.push(`${date},${e.moduleKey},${e.itemId},${e.completed ? "是" : "否"},${e.completed ? "已得分" : "0"},"${notes}"`);
        });
      });

      // Todos section
      csvSections.push("");
      csvSections.push("=== 待办事项 ===");
      csvSections.push("内容,优先级,已完成,截止日期,积分");
      todos.forEach((t) => {
        const text = t.text.replace(/"/g, '""');
        csvSections.push(`"${text}",${t.priority},${t.completed ? "是" : "否"},${t.dueDate || ""},${t.points}`);
      });

      // Goals section
      csvSections.push("");
      csvSections.push("=== 目标 ===");
      csvSections.push("标题,描述,类型,状态,目标日期,积分");
      goals.forEach((g) => {
        const title = g.title.replace(/"/g, '""');
        const desc = g.description.replace(/"/g, '""');
        csvSections.push(`"${title}","${desc}",${g.type === "short_term" ? "近期" : "远期"},${g.status},${g.targetDate || ""},${g.points}`);
      });

      const bom = "\uFEFF";
      const blob = new Blob([bom + csvSections.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lifelog-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV导出成功！");
    } catch { toast.error("导出失败，请重试"); }
  };

  const renderModuleEditor = (mod: Module) => (
    <div key={mod.key} className="bg-card rounded-xl shadow-card overflow-hidden">
      <button onClick={() => setExpandedModule(expandedModule === mod.key ? null : mod.key)} className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">{mod.icon}</span>
          {editingModuleName === mod.key ? (
            <Input className="h-7 w-32 text-sm" defaultValue={mod.name} autoFocus onClick={(e) => e.stopPropagation()} onBlur={(e) => handleRenameModule(mod.key, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleRenameModule(mod.key, (e.target as HTMLInputElement).value); }} />
          ) : (
            <span className="font-medium text-sm">{mod.name}</span>
          )}
          <button onClick={(e) => { e.stopPropagation(); setEditingModuleName(editingModuleName === mod.key ? null : mod.key); }} className="text-muted-foreground hover:text-foreground p-0.5"><Pencil className="w-3 h-3" /></button>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", expandedModule === mod.key && "rotate-90")} />
      </button>
      {expandedModule === mod.key && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {mod.items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-2">
              <Input className="h-8 text-sm flex-1" defaultValue={item.name} onBlur={(e) => handleRenameItem(mod.key, idx, e.target.value)} />
              <div className="flex items-center gap-1">
                <Input type="number" className="h-8 w-16 text-sm text-center" defaultValue={item.points} min={0} onBlur={(e) => handleChangePoints(mod.key, idx, parseInt(e.target.value) || 0)} />
                <span className="text-xs text-muted-foreground">分</span>
              </div>
              <button onClick={() => handleDeleteItem(mod.key, idx)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => handleAddItem(mod.key)} className="w-full"><Plus className="w-3.5 h-3.5 mr-1" />添加项目</Button>
        </div>
      )}
    </div>
  );

  if (loading) return <div className="px-4 pt-6 pb-4 max-w-lg mx-auto"><div className="animate-pulse h-8 bg-muted rounded w-32" /></div>;

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold text-foreground mb-5">设置</h1>

      <div className="bg-card rounded-xl shadow-card p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-display font-semibold">{user?.email}</h2>
            <p className="text-sm text-muted-foreground">个人成长记录</p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">📋 每日必修 · 积分设置</h2>
        {coreTotal !== 100 && (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg px-3 py-2 mb-3 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>核心模块总分当前为 {coreTotal} 分，建议保持等于 100 分</span>
          </div>
        )}
        <div className="space-y-2">{allModules.core.map((mod) => renderModuleEditor(mod))}</div>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-amber-600 mb-3 uppercase tracking-wider">⭐ 成长加分 · 积分设置</h2>
        <div className="space-y-2">{allModules.bonus.map((mod) => renderModuleEditor(mod))}</div>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">🏆 目标追踪 · 积分设置</h2>
        <div className="space-y-2">{renderModuleEditor(allModules.goals)}</div>
      </div>

      {/* Emotion & Relationship Settings */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">🧠 情绪类型管理</h2>
        <div className="bg-card rounded-xl shadow-card p-4 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {(config?.emotionTypes || ["😊 开心", "😢 难过", "😠 愤怒", "😰 焦虑", "😌 平静", "🤔 困惑", "😤 烦躁", "🥰 幸福", "😔 失落", "💪 自信"]).map((type, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-muted rounded-full px-2.5 py-1 text-xs">
                <span>{type}</span>
                <button onClick={() => {
                  const cfg = ensureConfig();
                  const types = cfg.emotionTypes || ["😊 开心", "😢 难过", "😠 愤怒", "😰 焦虑", "😌 平静", "🤔 困惑", "😤 烦躁", "🥰 幸福", "😔 失落", "💪 自信"];
                  types.splice(idx, 1);
                  cfg.emotionTypes = types;
                  updateConfig(cfg);
                }} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input className="h-8 text-sm" placeholder="添加情绪类型（如：😅 尴尬）" value={newEmotionType} onChange={(e) => setNewEmotionType(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newEmotionType.trim()) { const cfg = ensureConfig(); const types = cfg.emotionTypes || ["😊 开心", "😢 难过", "😠 愤怒", "😰 焦虑", "😌 平静", "🤔 困惑", "😤 烦躁", "🥰 幸福", "😔 失落", "💪 自信"]; types.push(newEmotionType.trim()); cfg.emotionTypes = types; updateConfig(cfg); setNewEmotionType(""); }}} />
            <Button size="sm" variant="outline" className="h-8" onClick={() => { if (!newEmotionType.trim()) return; const cfg = ensureConfig(); const types = cfg.emotionTypes || ["😊 开心", "😢 难过", "😠 愤怒", "😰 焦虑", "😌 平静", "🤔 困惑", "😤 烦躁", "🥰 幸福", "😔 失落", "💪 自信"]; types.push(newEmotionType.trim()); cfg.emotionTypes = types; updateConfig(cfg); setNewEmotionType(""); }}><Plus className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">❤️ 关系对象管理</h2>
        <div className="bg-card rounded-xl shadow-card p-4 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {(config?.relationshipPersons || ["伴侣", "家人", "朋友", "同事"]).map((person, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-muted rounded-full px-2.5 py-1 text-xs">
                <span>{person}</span>
                <button onClick={() => {
                  const cfg = ensureConfig();
                  const persons = cfg.relationshipPersons || ["伴侣", "家人", "朋友", "同事"];
                  persons.splice(idx, 1);
                  cfg.relationshipPersons = persons;
                  updateConfig(cfg);
                }} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input className="h-8 text-sm" placeholder="添加关系对象" value={newRelationPerson} onChange={(e) => setNewRelationPerson(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newRelationPerson.trim()) { const cfg = ensureConfig(); const persons = cfg.relationshipPersons || ["伴侣", "家人", "朋友", "同事"]; persons.push(newRelationPerson.trim()); cfg.relationshipPersons = persons; updateConfig(cfg); setNewRelationPerson(""); }}} />
            <Button size="sm" variant="outline" className="h-8" onClick={() => { if (!newRelationPerson.trim()) return; const cfg = ensureConfig(); const persons = cfg.relationshipPersons || ["伴侣", "家人", "朋友", "同事"]; persons.push(newRelationPerson.trim()); cfg.relationshipPersons = persons; updateConfig(cfg); setNewRelationPerson(""); }}><Plus className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="bg-card rounded-xl shadow-card p-4">
          <button onClick={handleReset} className="flex items-center gap-3 w-full text-sm text-destructive">
            <RotateCcw className="w-5 h-5" /><span>恢复默认设置</span><ChevronRight className="w-4 h-4 ml-auto" />
          </button>
        </div>
        <div className="bg-card rounded-xl shadow-card p-4">
          <button onClick={handleExportData} className="flex items-center gap-3 w-full text-sm">
            <Download className="w-5 h-5 text-muted-foreground" /><span>导出数据 (JSON)</span><ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
          </button>
        </div>
        <div className="bg-card rounded-xl shadow-card p-4">
          <button onClick={handleExportCSV} className="flex items-center gap-3 w-full text-sm">
            <Download className="w-5 h-5 text-muted-foreground" /><span>导出数据 (CSV)</span><ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">LifeLog v1.0 · 我的成长记录本</p>
    </div>
  );
}
