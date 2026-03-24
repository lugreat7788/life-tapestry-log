import { motion } from "framer-motion";
import { Leaf, TrendingUp } from "lucide-react";
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
    <div className="relative overflow-hidden rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-elevated">
      <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-primary-foreground/8" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <motion.span
            key={totalPoints}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="text-3xl font-display font-semibold tracking-tighter"
          >
            {totalPoints}
          </motion.span>
          <span className="text-xs opacity-50 font-light">分</span>
          <span className="text-[11px] opacity-40 font-light ml-1">
            核心 {corePoints}/{coreMax} · 加分 +{bonusPoints}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-primary-foreground/12 rounded-full px-2.5 py-1">
            <Leaf className="w-3 h-3 opacity-70" />
            <span className="text-[11px] font-medium">{streak}天</span>
          </div>
          <div className="flex items-center gap-1 bg-primary-foreground/12 rounded-full px-2.5 py-1">
            <TrendingUp className="w-3 h-3 opacity-70" />
            <span className="text-[11px] font-medium">{percentage}%</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-3 h-1 rounded-full bg-primary-foreground/15 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary-foreground/70"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </div>
    </div>
  );
}
