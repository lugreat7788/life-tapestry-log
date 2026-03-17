import { motion } from "framer-motion";
import { Flame, Star } from "lucide-react";
import { getStreakDays, getDailyLog } from "@/lib/store";
import { getTotalMaxPoints } from "@/lib/modules";

interface HeroCardProps {
  totalPoints: number;
}

export default function HeroCard({ totalPoints }: HeroCardProps) {
  const streak = getStreakDays();
  const maxPoints = getTotalMaxPoints();
  const percentage = Math.min(Math.round((totalPoints / maxPoints) * 100), 100);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-elevated">
      {/* Decorative circles */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary-foreground/10" />
      <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-primary-foreground/5" />

      <div className="relative z-10">
        <p className="text-sm font-medium opacity-80">今日成长积分</p>
        <motion.div
          key={totalPoints}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex items-baseline gap-2 mt-1"
        >
          <span className="text-5xl font-display font-bold tracking-tight">
            {totalPoints}
          </span>
          <span className="text-lg opacity-60">/ {maxPoints}</span>
        </motion.div>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-primary-foreground/15 rounded-full px-3 py-1">
            <Flame className="w-4 h-4" />
            <span className="text-sm font-medium">{streak} 天连续</span>
          </div>
          <div className="flex items-center gap-1.5 bg-primary-foreground/15 rounded-full px-3 py-1">
            <Star className="w-4 h-4" />
            <span className="text-sm font-medium">{percentage}% 完成</span>
          </div>
        </div>

        {/* Progress bar */}
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
