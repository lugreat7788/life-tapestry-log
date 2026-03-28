import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Floating points animation
interface FloatingPointsProps {
  points: number;
  isMinimum?: boolean;
  x?: number;
  y?: number;
  onComplete?: () => void;
}

export function FloatingPoints({ points, isMinimum, x = 0, y = 0, onComplete }: FloatingPointsProps) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), 1200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.5 }}
      animate={{ opacity: 0, y: -60, scale: 1.2 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="fixed z-[100] pointer-events-none"
      style={{ left: x, top: y }}
    >
      <span className={cn(
        "text-lg font-bold",
        isMinimum ? "text-amber-500" : "text-primary"
      )}>
        {isMinimum ? "🌱" : "✅"} +{points}分
      </span>
    </motion.div>
  );
}

// Full screen celebration when core hits 100
interface FullCelebrationProps {
  show: boolean;
  totalScore: number;
  onClose: () => void;
}

const CONFETTI_COLORS = [
  "hsl(var(--primary))",
  "hsl(38, 80%, 50%)",
  "hsl(152, 45%, 45%)",
  "hsl(340, 80%, 60%)",
  "hsl(280, 60%, 60%)",
];

export function FullCelebration({ show, totalScore, onClose }: FullCelebrationProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Confetti particles */}
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: 0,
                y: 0,
                scale: 0,
                rotate: 0,
              }}
              animate={{
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.5) * 600,
                scale: [0, 1, 0.5],
                rotate: Math.random() * 720,
              }}
              transition={{
                duration: 2 + Math.random(),
                delay: Math.random() * 0.3,
                ease: "easeOut",
              }}
              className="absolute w-3 h-3 rounded-sm"
              style={{
                backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                opacity: 0.8,
              }}
            />
          ))}

          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="text-center z-10"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: 3, duration: 0.5 }}
              className="text-5xl mb-4"
            >
              🎉
            </motion.div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">
              今日必修全满！
            </h2>
            <p className="text-lg font-bold text-primary">{totalScore} 分</p>
            <p className="text-xs text-muted-foreground mt-2">太棒了，继续保持！</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Streak milestone celebration
interface MilestoneBadgeProps {
  days: number;
  onClose: () => void;
}

export function MilestoneBadge({ days, onClose }: MilestoneBadgeProps) {
  const milestoneEmoji = days >= 100 ? "💎" : days >= 30 ? "🏆" : "🌟";
  const milestoneLabel = days >= 100 ? "百日传奇" : days >= 30 ? "月度达人" : "周冠军";

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className="bg-gradient-to-r from-amber-500/20 to-primary/20 rounded-2xl p-4 border border-amber-500/30 cursor-pointer"
      onClick={onClose}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">{milestoneEmoji}</span>
        <div>
          <p className="text-sm font-bold text-foreground">{milestoneLabel}</p>
          <p className="text-xs text-muted-foreground">连续打卡 {days} 天！</p>
        </div>
      </div>
    </motion.div>
  );
}

// Streak risk indicator
export function StreakRiskBanner({ streak, todayScore, unfinishedCount }: {
  streak: number;
  todayScore: number;
  unfinishedCount: number;
}) {
  const now = new Date();
  const isEvening = now.getHours() >= 21;

  if (streak < 2 || todayScore > 0 || !isEvening) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 mb-3"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">⚠️</span>
        <div>
          <p className="text-xs font-medium text-destructive">连续中断风险</p>
          <p className="text-[10px] text-destructive/70">
            今天还有 {unfinishedCount} 项未完成，保住你的连续 {streak} 天记录！
          </p>
        </div>
      </div>
    </motion.div>
  );
}
