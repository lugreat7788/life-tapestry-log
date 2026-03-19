import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CORE_MODULES, BONUS_MODULES, getModuleMaxPoints } from "@/lib/modules";
import { getDailyLog } from "@/lib/supabase-store";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { DailyLog } from "@/lib/store-types";

export default function ModulesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [log, setLog] = useState<DailyLog>({ date: "", entries: {}, totalPoints: 0 });

  useEffect(() => {
    if (!user) return;
    getDailyLog(user.id).then(setLog);
  }, [user]);

  const renderModuleGrid = (modules: typeof CORE_MODULES, startIndex: number, isBonus?: boolean) => (
    <div className="grid grid-cols-2 gap-3">
      {modules.map((mod, i) => {
        const completed = mod.items.filter((item) => log.entries[item.id]?.completed).length;
        const earned = mod.items.reduce((s, item) => s + (log.entries[item.id]?.completed ? item.points : 0), 0);
        return (
          <motion.button key={mod.key} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (startIndex + i) * 0.03, duration: 0.25 }} onClick={() => navigate(`/modules/${mod.key}`)} className={cn("flex flex-col items-center p-5 rounded-xl shadow-card text-center transition-all hover:shadow-elevated", mod.bgClass, isBonus && "ring-1 ring-amber-300/40")}>
            <span className="text-3xl mb-2">{mod.icon}</span>
            <h3 className={cn("font-display font-semibold text-sm", mod.fgClass)}>{mod.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">{completed}/{mod.items.length} 项 · {isBonus ? `+${earned}` : `${earned}分`}</p>
          </motion.button>
        );
      })}
    </div>
  );

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold text-foreground mb-5">模块</h1>
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">📋 每日必修（满分100分）</h2>
      {renderModuleGrid(CORE_MODULES, 0)}
      <h2 className="text-sm font-semibold text-amber-600 mt-6 mb-3 uppercase tracking-wider">⭐ 成长加分（额外加分）</h2>
      {renderModuleGrid(BONUS_MODULES, CORE_MODULES.length, true)}
    </div>
  );
}
