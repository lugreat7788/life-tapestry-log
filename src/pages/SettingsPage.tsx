import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { CORE_MODULES, BONUS_MODULES, GOALS_MODULE, DEFAULT_CORE_MODULES, DEFAULT_BONUS_MODULES, DEFAULT_GOALS_MODULE, getCoreMaxPoints, MODULES } from "@/lib/modules";
import type { Module } from "@/lib/modules";
import { getModuleConfig, saveModuleConfig, clearModuleConfig, getAllLogs, getTodos, getGoals, getEmotionRecords, getRelationshipRecords, getRewards, getRedemptions, getSleepData, getSkipReasons, getTodoCollections, getGoalCollections } from "@/lib/supabase-store";
import type { ModuleConfig } from "@/lib/store-types";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { User, Download, ChevronRight, ChevronDown, Plus, Trash2, RotateCcw, AlertTriangle, Pencil, LogOut, Brain, Heart, FileText, FileSpreadsheet, Globe, Battery } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
  const [showCoreSettings, setShowCoreSettings] = useState(false);
  const [showBonusSettings, setShowBonusSettings] = useState(false);
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [showEmotionSettings, setShowEmotionSettings] = useState(false);
  const [_showRelationSettings, _setShowRelationSettings] = useState(false);
  const [lowEnergyMode, setLowEnergyMode] = useState(() => localStorage.getItem("lifelog_low_energy") === "true");

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

  const gatherAllData = async () => {
    if (!user) return null;
    const [logs, todos, goals, emotionRecords, relationshipRecords, rewards, redemptions, sleepData, skipReasons, todoCollections, goalCollections] = await Promise.all([
      getAllLogs(user.id), getTodos(user.id), getGoals(user.id),
      getEmotionRecords(user.id), getRelationshipRecords(user.id),
      getRewards(user.id), getRedemptions(user.id), getSleepData(user.id),
      getSkipReasons(user.id),
      getTodoCollections(user.id), getGoalCollections(user.id),
    ]);
    return { logs, todos, goals, emotionRecords, relationshipRecords, rewards, redemptions, sleepData, skipReasons, todoCollections, goalCollections };
  };

  const handleExportData = async () => {
    if (!user) return;
    try {
      toast.info("正在导出数据...");
      const data = await gatherAllData();
      if (!data) return;

      const moduleNameMap: Record<string, string> = {};
      const itemNameMap: Record<string, string> = {};
      MODULES.forEach((m) => { moduleNameMap[m.key] = m.name; m.items.forEach((i) => { itemNameMap[i.id] = i.name; }); });

      const exportData = {
        exportDate: new Date().toISOString(),
        email: user.email,
        dailyLogs: Object.entries(data.logs).sort().map(([date, log]: [string, any]) => ({
          date, totalPoints: log.totalPoints,
          entries: Object.values(log.entries).map((e: any) => ({
            module: e.moduleKey, moduleName: moduleNameMap[e.moduleKey] || e.moduleKey,
            item: e.itemId, itemName: itemNameMap[e.itemId] || e.itemId,
            completed: e.completed, completionType: e.completionType || "full",
            notes: e.notes, sleepBedtime: e.sleepBedtime || null, sleepWaketime: e.sleepWaketime || null,
          })),
        })),
        todos: data.todos.map((t) => ({ text: t.text, priority: t.priority, completed: t.completed, dueDate: t.dueDate || null, points: t.points, collectionId: t.collectionId || null })),
        todoCollections: data.todoCollections,
        goals: data.goals.map((g) => ({ title: g.title, description: g.description, type: g.type, status: g.status, targetDate: g.targetDate || null, points: g.points, collectionId: g.collectionId || null })),
        goalCollections: data.goalCollections,
        emotionRecords: data.emotionRecords.map((e) => ({ date: e.date, person: e.person, emotionType: e.emotionType, intensity: e.intensity, trigger: e.trigger, thoughts: e.thoughts, copingStrategy: e.copingStrategy, reflection: e.reflection })),
        relationshipRecords: data.relationshipRecords.map((r) => ({ date: r.date, person: r.person, problem: r.problem, solution: r.solution, reflection: r.reflection, status: r.status })),
        rewards: data.rewards,
        redemptions: data.redemptions,
        sleepData: data.sleepData,
        skipReasons: data.skipReasons,
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
      const data = await gatherAllData();
      if (!data) return;

      const moduleNameMap: Record<string, string> = {};
      const itemNameMap: Record<string, string> = {};
      MODULES.forEach((m) => { moduleNameMap[m.key] = m.name; m.items.forEach((i) => { itemNameMap[i.id] = i.name; }); });

      const esc = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
      const sections: string[] = [];

      sections.push("=== 每日打卡记录 ===");
      sections.push("日期,模块,项目,已完成,完成类型,备注,睡眠-就寝,睡眠-起床");
      Object.entries(data.logs).sort().forEach(([date, log]: [string, any]) => {
        Object.values(log.entries).forEach((e: any) => {
          sections.push(`${date},${moduleNameMap[e.moduleKey] || e.moduleKey},${itemNameMap[e.itemId] || e.itemId},${e.completed ? "是" : "否"},${e.completionType === "minimum" ? "最小完成" : "完整完成"},${esc(e.notes)},${e.sleepBedtime || ""},${e.sleepWaketime || ""}`);
        });
      });

      sections.push("", "=== 待办事项 ===", "内容,优先级,已完成,截止日期,积分");
      data.todos.forEach((t) => sections.push(`${esc(t.text)},${t.priority},${t.completed ? "是" : "否"},${t.dueDate || ""},${t.points}`));

      sections.push("", "=== 目标 ===", "标题,描述,类型,状态,目标日期,积分");
      data.goals.forEach((g) => sections.push(`${esc(g.title)},${esc(g.description)},${g.type === "short_term" ? "近期" : "远期"},${g.status},${g.targetDate || ""},${g.points}`));

      sections.push("", "=== 情绪觉察 ===", "日期,对象,情绪类型,强度,触发事件,内心想法,应对方式,反思收获");
      data.emotionRecords.forEach((e) => sections.push(`${e.date},${e.person},${e.emotionType},${e.intensity},${esc(e.trigger)},${esc(e.thoughts)},${esc(e.copingStrategy)},${esc(e.reflection)}`));

      sections.push("", "=== 关系觉察 ===", "日期,对象,问题,解决方案,反思,状态");
      data.relationshipRecords.forEach((r) => sections.push(`${r.date},${r.person},${esc(r.problem)},${esc(r.solution)},${esc(r.reflection)},${r.status}`));


      sections.push("", "=== 睡眠记录 ===", "日期,就寝,起床,时长(小时)");
      data.sleepData.forEach((s) => sections.push(`${s.date},${s.bedtime},${s.waketime},${s.duration.toFixed(1)}`));

      sections.push("", "=== 跳过原因 ===", "日期,模块,项目,原因");
      data.skipReasons.forEach((s: any) => sections.push(`${s.date},${moduleNameMap[s.module_key] || s.module_key},${itemNameMap[s.item_id] || s.item_id},${esc(s.reason)}`));

      sections.push("", "=== 奖励兑换 ===", "奖励,花费积分,兑换时间");
      data.redemptions.forEach((r) => sections.push(`${esc(r.rewardName)},${r.pointsSpent},${r.redeemedAt}`));

      const bom = "\uFEFF";
      const blob = new Blob([bom + sections.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lifelog-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV导出成功！");
    } catch { toast.error("导出失败，请重试"); }
  };

  const handleExportHTML = async () => {
    if (!user) return;
    try {
      toast.info("正在生成报告...");
      const data = await gatherAllData();
      if (!data) return;

      const moduleNameMap: Record<string, string> = {};
      const itemNameMap: Record<string, string> = {};
      MODULES.forEach((m) => { moduleNameMap[m.key] = m.name; m.items.forEach((i) => { itemNameMap[i.id] = i.name; }); });

      const totalDays = Object.keys(data.logs).length;
      const totalPoints = Object.values(data.logs).reduce((s: number, l: any) => s + (l.totalPoints || 0), 0);
      const dateRange = Object.keys(data.logs).sort();
      const firstDate = dateRange[0] || "N/A";
      const lastDate = dateRange[dateRange.length - 1] || "N/A";

      const h = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      let html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>LifeLog 数据报告</title><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Noto Sans SC",sans-serif;background:#f5f5f0;color:#1a1a1a;line-height:1.6;padding:16px;max-width:800px;margin:0 auto}
h1{font-size:22px;margin-bottom:4px}
h2{font-size:17px;margin:24px 0 12px;padding:8px 12px;background:#e8e5dc;border-radius:10px;position:sticky;top:0;z-index:10}
h3{font-size:14px;margin:12px 0 6px;color:#555}
.card{background:#fff;border-radius:12px;padding:14px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.06)}
.stat{display:inline-block;background:#f0ede5;border-radius:8px;padding:6px 12px;margin:3px;font-size:13px}
.stat b{color:#2d6a4f}
table{width:100%;border-collapse:collapse;font-size:12px;margin:6px 0}
th{background:#f0ede5;text-align:left;padding:6px 8px;font-weight:500;position:sticky;top:40px}
td{padding:5px 8px;border-bottom:1px solid #eee;vertical-align:top;word-break:break-word}
tr:nth-child(even){background:#fafaf7}
.badge{display:inline-block;padding:1px 6px;border-radius:4px;font-size:11px;font-weight:500}
.done{background:#d4edda;color:#155724}
.undone{background:#f8d7da;color:#721c24}
.note{color:#666;font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis}
.bar{height:6px;border-radius:3px;background:#d4edda;margin-top:3px}
.section-nav{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}
.section-nav a{font-size:12px;padding:4px 10px;background:#fff;border-radius:8px;text-decoration:none;color:#2d6a4f;box-shadow:0 1px 2px rgba(0,0,0,0.06)}
.meta{font-size:12px;color:#888;margin-bottom:16px}
@media(max-width:600px){table{font-size:11px}td,th{padding:4px 5px}.stat{font-size:12px;padding:4px 8px}}
</style></head><body>
<h1>📊 LifeLog 数据报告</h1>
<p class="meta">${user.email} · 导出于 ${format(new Date(), "yyyy年MM月dd日 HH:mm")}</p>

<div class="section-nav">
<a href="#overview">📈 概览</a>
<a href="#daily">📝 打卡</a>
<a href="#emotion">👁️ 情绪</a>
<a href="#relation">🤝 关系</a>
<a href="#screen">📱 手机</a>
<a href="#sleep">😴 睡眠</a>
<a href="#goals">🏆 目标</a>
<a href="#todos">✅ 待办</a>
<a href="#rewards">🎁 奖励</a>
<a href="#skip">⏭️ 跳过</a>
</div>

<h2 id="overview">📈 数据概览</h2>
<div class="card">
<div class="stat">📅 记录 <b>${totalDays}</b> 天</div>
<div class="stat">⭐ 总积分 <b>${totalPoints}</b></div>
<div class="stat">📅 从 <b>${firstDate}</b></div>
<div class="stat">📅 到 <b>${lastDate}</b></div>
<div class="stat">😊 情绪 <b>${data.emotionRecords.length}</b> 条</div>
<div class="stat">🤝 关系 <b>${data.relationshipRecords.length}</b> 条</div>
<div class="stat">🏆 目标 <b>${data.goals.length}</b> 个</div>
<div class="stat">✅ 待办 <b>${data.todos.length}</b> 项</div>
<div class="stat">🎁 兑换 <b>${data.redemptions.length}</b> 次</div>
</div>`;

      // Daily logs
      html += `<h2 id="daily">📝 每日打卡记录</h2>`;
      const sortedDates = Object.keys(data.logs).sort().reverse();
      sortedDates.forEach((date) => {
        const log: any = data.logs[date];
        const entries = Object.values(log.entries) as any[];
        const completedCount = entries.filter((e: any) => e.completed).length;
        html += `<div class="card"><h3>${date} · ${log.totalPoints}分 · ${completedCount}/${entries.length}项</h3><table><tr><th>模块</th><th>项目</th><th>状态</th><th>备注</th></tr>`;
        entries.forEach((e: any) => {
          const status = e.completed
            ? `<span class="badge done">${e.completionType === "minimum" ? "🌱最小" : "✅完成"}</span>`
            : `<span class="badge undone">未完成</span>`;
          html += `<tr><td>${h(moduleNameMap[e.moduleKey] || e.moduleKey)}</td><td>${h(itemNameMap[e.itemId] || e.itemId)}</td><td>${status}</td><td class="note">${h(e.notes)}</td></tr>`;
        });
        html += `</table></div>`;
      });

      // Emotion records
      if (data.emotionRecords.length) {
        html += `<h2 id="emotion">👁️ 情绪觉察</h2>`;
        html += `<div class="card"><table><tr><th>日期</th><th>对象</th><th>情绪</th><th>强度</th><th>触发</th><th>想法</th><th>应对</th><th>反思</th></tr>`;
        data.emotionRecords.forEach((e) => {
          html += `<tr><td>${e.date}</td><td>${h(e.person)}</td><td>${h(e.emotionType)}</td><td>${e.intensity}/10</td><td class="note">${h(e.trigger)}</td><td class="note">${h(e.thoughts)}</td><td class="note">${h(e.copingStrategy)}</td><td class="note">${h(e.reflection)}</td></tr>`;
        });
        html += `</table></div>`;
      }

      // Relationship records
      if (data.relationshipRecords.length) {
        html += `<h2 id="relation">🤝 关系觉察</h2>`;
        html += `<div class="card"><table><tr><th>日期</th><th>对象</th><th>问题</th><th>方案</th><th>反思</th><th>状态</th></tr>`;
        data.relationshipRecords.forEach((r) => {
          const statusMap: Record<string, string> = { unresolved: "未解决", in_progress: "进行中", resolved: "已解决" };
          html += `<tr><td>${r.date}</td><td>${h(r.person)}</td><td class="note">${h(r.problem)}</td><td class="note">${h(r.solution)}</td><td class="note">${h(r.reflection)}</td><td>${statusMap[r.status] || r.status}</td></tr>`;
        });
        html += `</table></div>`;
      }


      // Sleep
      if (data.sleepData.length) {
        html += `<h2 id="sleep">😴 睡眠记录</h2>`;
        html += `<div class="card"><table><tr><th>日期</th><th>就寝</th><th>起床</th><th>时长</th></tr>`;
        data.sleepData.forEach((s) => {
          html += `<tr><td>${s.date}</td><td>${s.bedtime}</td><td>${s.waketime}</td><td>${s.duration.toFixed(1)}h</td></tr>`;
        });
        html += `</table></div>`;
      }

      // Goals
      html += `<h2 id="goals">🏆 目标</h2>`;
      if (data.goals.length) {
        html += `<div class="card"><table><tr><th>标题</th><th>类型</th><th>状态</th><th>目标日</th><th>描述</th></tr>`;
        const statusMap: Record<string, string> = { not_started: "未开始", in_progress: "进行中", completed: "已完成" };
        data.goals.forEach((g) => {
          html += `<tr><td>${h(g.title)}</td><td>${g.type === "short_term" ? "近期" : "远期"}</td><td>${statusMap[g.status] || g.status}</td><td>${g.targetDate || "-"}</td><td class="note">${h(g.description)}</td></tr>`;
        });
        html += `</table></div>`;
      }

      // Todos
      html += `<h2 id="todos">✅ 待办事项</h2>`;
      if (data.todos.length) {
        html += `<div class="card"><table><tr><th>内容</th><th>优先级</th><th>状态</th><th>截止</th><th>积分</th></tr>`;
        data.todos.forEach((t) => {
          html += `<tr><td>${h(t.text)}</td><td>${t.priority}</td><td>${t.completed ? '<span class="badge done">✅</span>' : '<span class="badge undone">待完成</span>'}</td><td>${t.dueDate || "-"}</td><td>${t.points}</td></tr>`;
        });
        html += `</table></div>`;
      }

      // Rewards & Redemptions
      html += `<h2 id="rewards">🎁 奖励兑换</h2>`;
      if (data.redemptions.length) {
        html += `<div class="card"><table><tr><th>奖励</th><th>花费积分</th><th>兑换时间</th></tr>`;
        data.redemptions.forEach((r) => {
          html += `<tr><td>${h(r.rewardName)}</td><td>${r.pointsSpent}</td><td>${r.redeemedAt?.slice(0, 10) || ""}</td></tr>`;
        });
        html += `</table></div>`;
      }

      // Skip reasons
      if (data.skipReasons.length) {
        html += `<h2 id="skip">⏭️ 跳过原因记录</h2>`;
        html += `<div class="card"><table><tr><th>日期</th><th>模块</th><th>项目</th><th>原因</th></tr>`;
        data.skipReasons.forEach((s: any) => {
          html += `<tr><td>${s.date}</td><td>${h(moduleNameMap[s.module_key] || s.module_key)}</td><td>${h(itemNameMap[s.item_id] || s.item_id)}</td><td>${h(s.reason)}</td></tr>`;
        });
        html += `</table></div>`;
      }

      html += `<p style="text-align:center;color:#999;font-size:11px;margin:24px 0">LifeLog · 我的成长记录本</p></body></html>`;

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lifelog-report-${new Date().toISOString().slice(0, 10)}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("HTML报告导出成功！可在手机浏览器直接打开");
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
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  className="h-8 w-14 text-sm text-center"
                  placeholder="最小"
                  defaultValue={(item as any).minPoints || ""}
                  min={0}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    const cfg = ensureConfig();
                    (cfg.modules[mod.key].items[idx] as any).minPoints = val;
                    updateConfig(cfg);
                  }}
                />
                <span className="text-[9px] text-muted-foreground leading-tight">🌱</span>
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

      <div className="mb-4">
        <button onClick={() => setShowCoreSettings(!showCoreSettings)} className="flex items-center justify-between w-full text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
          <span>📋 每日必修 · 积分设置</span>
          <ChevronDown className={cn("w-4 h-4 transition-transform", showCoreSettings && "rotate-180")} />
        </button>
        {showCoreSettings && (
          <div>
            {coreTotal !== 100 && (
              <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg px-3 py-2 mb-3 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>核心模块总分当前为 {coreTotal} 分，建议保持等于 100 分</span>
              </div>
            )}
            <div className="space-y-2">{allModules.core.map((mod) => renderModuleEditor(mod))}</div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <button onClick={() => setShowBonusSettings(!showBonusSettings)} className="flex items-center justify-between w-full text-sm font-semibold text-amber-600 mb-2 uppercase tracking-wider">
          <span>⭐ 成长加分 · 积分设置</span>
          <ChevronDown className={cn("w-4 h-4 transition-transform", showBonusSettings && "rotate-180")} />
        </button>
        {showBonusSettings && (
          <div className="space-y-2">{allModules.bonus.map((mod) => renderModuleEditor(mod))}</div>
        )}
      </div>

      <div className="mb-4">
        <button onClick={() => setShowGoalSettings(!showGoalSettings)} className="flex items-center justify-between w-full text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
          <span>🏆 目标追踪 · 积分设置</span>
          <ChevronDown className={cn("w-4 h-4 transition-transform", showGoalSettings && "rotate-180")} />
        </button>
        {showGoalSettings && (
          <div className="space-y-2">{renderModuleEditor(allModules.goals)}</div>
        )}
      </div>

      <div className="mb-4">
        <button onClick={() => setShowEmotionSettings(!showEmotionSettings)} className="flex items-center justify-between w-full text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
          <span>👁️ 觉察设置（情绪类型 & 对象管理）</span>
          <ChevronDown className={cn("w-4 h-4 transition-transform", showEmotionSettings && "rotate-180")} />
        </button>
        {showEmotionSettings && (
          <div className="bg-card rounded-xl shadow-card p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">情绪类型</label>
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
              <div className="flex gap-2 mt-2">
                <Input className="h-8 text-sm" placeholder="添加情绪类型（如：😅 尴尬）" value={newEmotionType} onChange={(e) => setNewEmotionType(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newEmotionType.trim()) { const cfg = ensureConfig(); const types = cfg.emotionTypes || ["😊 开心", "😢 难过", "😠 愤怒", "😰 焦虑", "😌 平静", "🤔 困惑", "😤 烦躁", "🥰 幸福", "😔 失落", "💪 自信"]; types.push(newEmotionType.trim()); cfg.emotionTypes = types; updateConfig(cfg); setNewEmotionType(""); }}} />
                <Button size="sm" variant="outline" className="h-8" onClick={() => { if (!newEmotionType.trim()) return; const cfg = ensureConfig(); const types = cfg.emotionTypes || ["😊 开心", "😢 难过", "😠 愤怒", "😰 焦虑", "😌 平静", "🤔 困惑", "😤 烦躁", "🥰 幸福", "😔 失落", "💪 自信"]; types.push(newEmotionType.trim()); cfg.emotionTypes = types; updateConfig(cfg); setNewEmotionType(""); }}><Plus className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">觉察对象（"自己"为默认，无需添加）</label>
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
              <div className="flex gap-2 mt-2">
                <Input className="h-8 text-sm" placeholder="添加觉察对象" value={newRelationPerson} onChange={(e) => setNewRelationPerson(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newRelationPerson.trim()) { const cfg = ensureConfig(); const persons = cfg.relationshipPersons || ["伴侣", "家人", "朋友", "同事"]; persons.push(newRelationPerson.trim()); cfg.relationshipPersons = persons; updateConfig(cfg); setNewRelationPerson(""); }}} />
                <Button size="sm" variant="outline" className="h-8" onClick={() => { if (!newRelationPerson.trim()) return; const cfg = ensureConfig(); const persons = cfg.relationshipPersons || ["伴侣", "家人", "朋友", "同事"]; persons.push(newRelationPerson.trim()); cfg.relationshipPersons = persons; updateConfig(cfg); setNewRelationPerson(""); }}><Plus className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl shadow-card p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Battery className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">低能量模式</p>
              <p className="text-[10px] text-muted-foreground">状态不佳时开启，首页只显示最小记录项，减轻负担</p>
            </div>
          </div>
          <Switch
            checked={lowEnergyMode}
            onCheckedChange={(checked) => {
              setLowEnergyMode(checked);
              localStorage.setItem("lifelog_low_energy", String(checked));
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="bg-card rounded-xl shadow-card p-4">
          <button onClick={handleReset} className="flex items-center gap-3 w-full text-sm text-destructive">
            <RotateCcw className="w-5 h-5" /><span>恢复默认设置</span><ChevronRight className="w-4 h-4 ml-auto" />
          </button>
        </div>
        <div className="bg-card rounded-xl shadow-card p-4">
          <button onClick={handleExportHTML} className="flex items-center gap-3 w-full text-sm">
            <Globe className="w-5 h-5 text-primary" /><span>导出报告 (HTML) <span className="text-xs text-muted-foreground">· 手机友好</span></span><ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
          </button>
        </div>
        <div className="bg-card rounded-xl shadow-card p-4">
          <button onClick={handleExportData} className="flex items-center gap-3 w-full text-sm">
            <FileText className="w-5 h-5 text-muted-foreground" /><span>导出数据 (JSON)</span><ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
          </button>
        </div>
        <div className="bg-card rounded-xl shadow-card p-4">
          <button onClick={handleExportCSV} className="flex items-center gap-3 w-full text-sm">
            <FileSpreadsheet className="w-5 h-5 text-muted-foreground" /><span>导出数据 (CSV)</span><ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">LifeLog v1.0 · 我的成长记录本</p>
    </div>
  );
}
