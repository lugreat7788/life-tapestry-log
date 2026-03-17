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
}

export default function ModuleCard({ module, log, index }: ModuleCardProps) {
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={() => navigate(`/modules/${module.key}`)}
      className={cn(
        "w-full text-left rounded-xl p-4 shadow-card transition-all duration-200 hover:shadow-elevated",
        module.bgClass,
        allDone && "ring-2 ring-primary/30"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{module.icon}</span>
          <div>
            <h3 className={cn("font-display font-semibold text-sm", module.fgClass)}>
              {module.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {earnedPoints} / {maxPoints} 分
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-medium", module.fgClass)}>
            {completedCount}/{totalCount}
          </span>
          {allDone && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
            >
              <Check className="w-3.5 h-3.5 text-primary-foreground" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Mini progress bar */}
      <div className="mt-3 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-foreground/30"
          initial={{ width: 0 }}
          animate={{ width: `${(completedCount / totalCount) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.04 + 0.2 }}
        />
      </div>
    </motion.button>
  );
}
