import { motion } from "framer-motion";
import { Flame, Trophy, Zap } from "lucide-react";
interface HeroCardProps {
  corePoints: number;
  bonusPoints: number;
  streakDays: number;
  allTimePoints: number;
  coreMax: number;
}

export default function HeroCard({ corePoints, bonusPoints, streakDays, allTimePoints, coreMax }: HeroCardProps) {
  const percentage = Math.min(Math.round((corePoints / coreMax) * 100), 100);
  const todayPoints = corePoints + bonusPoints;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-primary px-5 py-3 text-primary-foreground shadow-elevated">
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary-foreground/5" />
      <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-primary-foreground/4" />

      <div className="relative z-10 grid grid-cols-3 gap-4 text-center">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 opacity-50">
            <Trophy className="w-3 h-3" />
            <span className="text-[9px] font-medium tracking-wide">总积分</span>
          </div>
          <motion.span
            key={allTimePoints}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="text-2xl font-display font-semibold tabular-nums"
          >
            {allTimePoints}
          </motion.span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 opacity-50">
            <Flame className="w-3 h-3" />
            <span className="text-[9px] font-medium tracking-wide">连续</span>
          </div>
          <motion.span
            key={streakDays}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="text-2xl font-display font-semibold tabular-nums"
          >
            {streakDays}<span className="text-[10px] font-normal opacity-50 ml-0.5">天</span>
          </motion.span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 opacity-50">
            <Zap className="w-3 h-3" />
            <span className="text-[9px] font-medium tracking-wide">今日</span>
          </div>
          <motion.span
            key={todayPoints}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="text-2xl font-display font-semibold tabular-nums"
          >
            {todayPoints}<span className="text-[10px] font-normal opacity-50 ml-0.5">分</span>
          </motion.span>
        </div>
      </div>

      <div className="relative z-10 mt-3 h-1 rounded-full bg-primary-foreground/12 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary-foreground/60"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </div>
      <p className="relative z-10 text-[9px] opacity-35 text-center mt-1.5 font-light tracking-wide">
        核心 {corePoints}/{coreMax} · 加分 +{bonusPoints}
      </p>
    </div>
  );
}
