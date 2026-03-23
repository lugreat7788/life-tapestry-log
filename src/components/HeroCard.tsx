import { motion } from "framer-motion";
import { Leaf, Star, TrendingUp } from "lucide-react";
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
    <div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-elevated">
      {/* Soft organic shapes */}
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary-foreground/8" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-primary-foreground/5" />
      <div className="absolute top-1/2 right-1/4 w-16 h-16 rounded-full bg-primary-foreground/4" />

      <div className="relative z-10">
        <p className="text-sm font-light opacity-80 tracking-wide">今日得分</p>

        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-xs font-light opacity-60 tracking-wide">核心</span>
          <motion.span
            key={corePoints}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="text-4xl font-display font-semibold tracking-tighter"
          >
            {corePoints}
          </motion.span>
          <span className="text-sm opacity-40 font-light">/ {coreMax}</span>
        </div>

        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-xs font-light opacity-60">成长加分</span>
          <span className="text-base font-medium opacity-80">+{bonusPoints}</span>
        </div>

        <div className="mt-3 h-px bg-primary-foreground/15" />

        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-xs font-light opacity-60">总计</span>
          <motion.span
            key={totalPoints}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="text-5xl font-display font-semibold tracking-tighter"
          >
            {totalPoints}
          </motion.span>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-primary-foreground/12 rounded-full px-3 py-1.5">
            <Leaf className="w-3.5 h-3.5 opacity-80" />
            <span className="text-xs font-medium">{streak} 天</span>
          </div>
          <div className="flex items-center gap-1.5 bg-primary-foreground/12 rounded-full px-3 py-1.5">
            <TrendingUp className="w-3.5 h-3.5 opacity-80" />
            <span className="text-xs font-medium">{percentage}%</span>
          </div>
        </div>

        <div className="mt-4 h-1.5 rounded-full bg-primary-foreground/15 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary-foreground/70"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </div>
      </div>
    </div>
  );
}
