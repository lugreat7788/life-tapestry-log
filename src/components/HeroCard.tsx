import { motion } from "framer-motion";
import { Flame, Trophy, Zap } from "lucide-react";
import { getCoreMaxPoints } from "@/lib/modules";

interface HeroCardProps {
  corePoints: number;
  bonusPoints: number;
  streakDays: number;
  allTimePoints: number;
}

export default function HeroCard({ corePoints, bonusPoints, streakDays, allTimePoints }: HeroCardProps) {
  const coreMax = getCoreMaxPoints();
  const percentage = Math.min(Math.round((corePoints / coreMax) * 100), 100);
  const todayPoints = corePoints + bonusPoints;

  return (
    <div className="relative overflow-hidden rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-elevated">
      <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-primary-foreground/8" />

      <div className="relative z-10 grid grid-cols-3 gap-3 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1 opacity-60">
            <Trophy className="w-3 h-3" />
            <span className="text-[10px] font-medium">总积分</span>
          </div>
          <motion.span
            key={allTimePoints}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="text-xl font-display font-semibold tracking-tight"
          >
            {allTimePoints}
          </motion.span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1 opacity-60">
            <Flame className="w-3 h-3" />
            <span className="text-[10px] font-medium">连续</span>
          </div>
          <motion.span
            key={streakDays}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="text-xl font-display font-semibold tracking-tight"
          >
            {streakDays}<span className="text-xs font-light opacity-60 ml-0.5">天</span>
          </motion.span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1 opacity-60">
            <Zap className="w-3 h-3" />
            <span className="text-[10px] font-medium">今日</span>
          </div>
          <motion.span
            key={todayPoints}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="text-xl font-display font-semibold tracking-tight"
          >
            {todayPoints}<span className="text-xs font-light opacity-60 ml-0.5">分</span>
          </motion.span>
        </div>
      </div>

      <div className="relative z-10 mt-2.5 h-1 rounded-full bg-primary-foreground/15 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary-foreground/70"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </div>
      <p className="relative z-10 text-[10px] opacity-40 text-center mt-1 font-light">
        核心 {corePoints}/{coreMax} · 加分 +{bonusPoints}
      </p>
    </div>
  );
}
