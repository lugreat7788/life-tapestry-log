import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDailyLog } from "@/lib/supabase-store";
import { useAuth } from "@/hooks/useAuth";
import { useModuleConfig } from "@/hooks/useModuleConfig";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { DailyLog } from "@/lib/store-types";

export default function ModulesPage() {
  const { user } = useAuth();
  const { bonusModules } = useModuleConfig();
  const navigate = useNavigate();
  const [log, setLog] = useState<DailyLog>({ date: "", entries: {}, totalPoints: 0 });

  useEffect(() => {
    if (!user) return;
    getDailyLog(user.id).then(setLog);
  }, [user]);

  return (
    <div className="px-4 pt-4 pb-4 max-w-lg mx-auto">
      <h1 className="text-lg font-display font-bold text-foreground mb-4">成长加分</h1>
      <div className="space-y-3">
        {bonusModules.map((mod, i) => {
          const earned = mod.items.reduce((s, item) => s + (log.entries[item.id]?.completed ? item.points : 0), 0);
          return (
            <motion.div
              key={mod.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className="rounded-xl bg-card shadow-card p-3"
            >
              <button
                onClick={() => navigate(`/modules/${mod.key}`)}
                className="flex items-center gap-2.5 w-full text-left mb-2"
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-base", mod.bgClass)}>
                  {mod.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-sm text-foreground">{mod.name}</h3>
                </div>
                <span className="text-[11px] text-muted-foreground font-light">+{earned}</span>
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                {mod.items.map((item) => {
                  const done = log.entries[item.id]?.completed;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(`/modules/${mod.key}`)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left transition-all text-xs",
                        done
                          ? "bg-primary/10 text-primary"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <div className={cn(
                        "w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors",
                        done ? "bg-primary border-primary" : "border-muted-foreground/30"
                      )}>
                        {done && <Check className="w-2 h-2 text-primary-foreground" />}
                      </div>
                      <span className="truncate">{item.name}</span>
                      <span className="ml-auto text-[10px] opacity-50">+{item.points}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
