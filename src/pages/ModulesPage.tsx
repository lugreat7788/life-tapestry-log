import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MODULES, getModuleMaxPoints } from "@/lib/modules";
import { getDailyLog } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

export default function ModulesPage() {
  const [log] = useState(() => getDailyLog());
  const navigate = useNavigate();

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold text-foreground mb-5">
        模块
      </h1>

      <div className="grid grid-cols-2 gap-3">
        {MODULES.map((mod, i) => {
          const completed = mod.items.filter(
            (item) => log.entries[item.id]?.completed
          ).length;
          const earned = mod.items.reduce(
            (s, item) => s + (log.entries[item.id]?.completed ? item.points : 0),
            0
          );

          return (
            <motion.button
              key={mod.key}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
              onClick={() => navigate(`/modules/${mod.key}`)}
              className={cn(
                "flex flex-col items-center p-5 rounded-xl shadow-card text-center transition-all hover:shadow-elevated",
                mod.bgClass
              )}
            >
              <span className="text-3xl mb-2">{mod.icon}</span>
              <h3 className={cn("font-display font-semibold text-sm", mod.fgClass)}>
                {mod.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {completed}/{mod.items.length} 项 · {earned}分
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
