import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { Module } from "@/lib/modules";
import { getModuleMaxPoints } from "@/lib/modules";
import type { DailyLog } from "@/lib/store";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  module: Module;
  log: DailyLog;
  index: number;
  showBonus?: boolean;
}

export default function ModuleCard({ module, log, index, showBonus }: ModuleCardProps) {
  const navigate = useNavigate();

  const completedCount = module.items.filter(
    (item) => log.entries[item.id]?.completed
  ).length;
  const totalCount = module.items.length;
  const earnedPoints = module.items.reduce(
    (sum, item) => sum + (log.entries[item.id]?.completed ? item.points : 0),
    0
  );
  const maxPoints = getModuleMaxPoints(module);
  const allDone = completedCount === totalCount;

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      onClick={() => navigate(`/modules/${module.key}`)}
      className={cn(
        "w-full text-left rounded-2xl p-4 transition-all duration-200",
        "bg-card shadow-card hover:shadow-elevated active:scale-[0.99]",
        allDone && "ring-1 ring-primary/15",
        showBonus && "border border-dashed border-muted-foreground/10"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-base", module.bgClass)}>
            {module.icon}
          </div>
          <div>
            <h3 className="font-display font-medium text-[13px] text-foreground leading-tight">
              {module.name}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-light tabular-nums">
              {showBonus ? `+${earnedPoints}` : `${earnedPoints}/${maxPoints}`} 分
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[11px] text-muted-foreground font-light tabular-nums">
            {completedCount}/{totalCount}
          </span>
          {allDone && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"
            >
              <Check className="w-3 h-3 text-primary-foreground" />
            </motion.div>
          )}
        </div>
      </div>

      <div className="mt-3 h-[3px] rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary/35"
          initial={{ width: 0 }}
          animate={{ width: `${(completedCount / totalCount) * 100}%` }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay: index * 0.03 + 0.2 }}
        />
      </div>
    </motion.button>
  );
}
