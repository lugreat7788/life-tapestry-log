import { motion } from "framer-motion";
import { Flame, Star, TrendingUp } from "lucide-react";
import { getStreakDays } from "@/lib/store";
import { getCoreMaxPoints } from "@/lib/modules";

interface HeroCardProps {
  corePoints: number;
  bonusPoints: number;
}

export default function HeroCard({ corePoints, bonusPoints }: HeroCardProps) {
  const streak = getStreakDays();
  const coreMax = getCoreMaxPoints();
  const percentage = Math.min(Math.round((corePoints / coreMax) * 100), 100);
  const totalPoints = corePoints + bonusPoints;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-elevated">
      {/* Decorative circles */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary-foreground/10" />
      <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-primary-foreground/5" />

      <div className="relative z-10">
        <p className="text-sm font-medium opacity-80">今日得分</p>

        {/* Core score */}
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-sm opacity-70">核心分：</span>
          <motion.span
            key={corePoints}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="text-3xl font-display font-bold tracking-tight"
          >
            {corePoints}
          </motion.span>
          <span className="text-base opacity-60">/ {coreMax}</span>
        </div>

        {/* Bonus + Total */}
        <div className="flex items-baseline gap-4 mt-1">
          <div className="flex items-baseline gap-1">
            <span className="text-sm opacity-70">成长加分：</span>
            <span className="text-lg font-display font-semibold text-amber-200">+{bonusPoints}</span>
          </div>
        </div>

        <div className="mt-2 h-px bg-primary-foreground/20" />

        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-sm opacity-70">今日总分：</span>
          <motion.span
            key={totalPoints}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-4xl font-display font-bold tracking-tight"
          >
            {totalPoints}
          </motion.span>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-primary-foreground/15 rounded-full px-3 py-1">
            <Flame className="w-4 h-4" />
            <span className="text-sm font-medium">{streak} 天连续</span>
          </div>
          <div className="flex items-center gap-1.5 bg-primary-foreground/15 rounded-full px-3 py-1">
            <Star className="w-4 h-4" />
            <span className="text-sm font-medium">{percentage}% 核心完成</span>
          </div>
        </div>

        {/* Progress bar for core */}
        <div className="mt-4 h-2 rounded-full bg-primary-foreground/20 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary-foreground/80"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}
