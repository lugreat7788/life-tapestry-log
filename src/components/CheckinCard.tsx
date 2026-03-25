import { useRef, useCallback } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { motion } from "framer-motion";
import { Flame, Trophy, Zap, Camera, Check, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Module } from "@/lib/modules";
import type { DailyLog } from "@/lib/store-types";

interface CheckinCardProps {
  log: DailyLog;
  coreModules: Module[];
  bonusModules: Module[];
  streakDays: number;
  allTimePoints: number;
  onClose: () => void;
}

export default function CheckinCard({ log, coreModules, bonusModules, streakDays, allTimePoints, onClose }: CheckinCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const todayStr = format(new Date(), "yyyy年M月d日 EEEE", { locale: zhCN });

  const corePoints = coreModules.reduce(
    (sum, mod) => sum + mod.items.reduce((s, item) => s + (log.entries[item.id]?.completed ? item.points : 0), 0), 0
  );
  const bonusPoints = bonusModules.reduce(
    (sum, mod) => sum + mod.items.reduce((s, item) => s + (log.entries[item.id]?.completed ? item.points : 0), 0), 0
  );
  const todayPoints = corePoints + bonusPoints;

  const allCompleted = coreModules.flatMap(m => m.items).filter(item => log.entries[item.id]?.completed);
  const allCoreItems = coreModules.flatMap(m => m.items);
  const coreCompletionRate = allCoreItems.length > 0 ? Math.round((allCompleted.length / allCoreItems.length) * 100) : 0;

  const handleScreenshot = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `打卡-${format(new Date(), "yyyyMMdd")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      // fallback: copy to clipboard or alert
      alert("截图功能需要 html2canvas 库支持");
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        {/* The card to screenshot */}
        <div
          ref={cardRef}
          className="rounded-2xl overflow-hidden shadow-elevated"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8), hsl(239, 84%, 55%))",
          }}
        >
          <div className="px-6 pt-6 pb-5 text-primary-foreground">
            {/* Header */}
            <div className="text-center mb-5">
              <p className="text-xs opacity-60 mb-1">LifeLog · 每日打卡</p>
              <p className="text-sm font-medium opacity-80">{todayStr}</p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 text-center mb-5">
              <div className="bg-primary-foreground/10 rounded-xl py-3">
                <Trophy className="w-4 h-4 mx-auto mb-1 opacity-70" />
                <p className="text-xl font-display font-bold">{allTimePoints}</p>
                <p className="text-[9px] opacity-50">总积分</p>
              </div>
              <div className="bg-primary-foreground/10 rounded-xl py-3">
                <Flame className="w-4 h-4 mx-auto mb-1 opacity-70" />
                <p className="text-xl font-display font-bold">{streakDays}<span className="text-xs opacity-50">天</span></p>
                <p className="text-[9px] opacity-50">连续打卡</p>
              </div>
              <div className="bg-primary-foreground/10 rounded-xl py-3">
                <Zap className="w-4 h-4 mx-auto mb-1 opacity-70" />
                <p className="text-xl font-display font-bold">{todayPoints}<span className="text-xs opacity-50">分</span></p>
                <p className="text-[9px] opacity-50">今日得分</p>
              </div>
            </div>

            {/* Completion bar */}
            <div className="mb-4">
              <div className="flex justify-between text-[10px] opacity-60 mb-1">
                <span>核心完成度</span>
                <span>{coreCompletionRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-primary-foreground/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-foreground/70 transition-all"
                  style={{ width: `${coreCompletionRate}%` }}
                />
              </div>
            </div>

            {/* Module checklist */}
            <div className="space-y-2.5">
              {coreModules.map((mod) => {
                const completed = mod.items.filter(item => log.entries[item.id]?.completed).length;
                const total = mod.items.length;
                return (
                  <div key={mod.key} className="flex items-center gap-2">
                    <span className="text-sm">{mod.icon}</span>
                    <span className="text-xs font-medium flex-1">{mod.name}</span>
                    <div className="flex gap-0.5">
                      {mod.items.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "w-3.5 h-3.5 rounded-full flex items-center justify-center",
                            log.entries[item.id]?.completed
                              ? "bg-primary-foreground/80"
                              : "bg-primary-foreground/15"
                          )}
                        >
                          {log.entries[item.id]?.completed && (
                            <Check className="w-2 h-2 text-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] opacity-50 w-8 text-right">{completed}/{total}</span>
                  </div>
                );
              })}

              {/* Bonus summary */}
              {bonusPoints > 0 && (
                <div className="flex items-center gap-2 pt-1 border-t border-primary-foreground/10">
                  <span className="text-sm">⭐</span>
                  <span className="text-xs font-medium flex-1">成长加分</span>
                  <span className="text-xs font-bold">+{bonusPoints}分</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center mt-5 pt-3 border-t border-primary-foreground/10">
              <p className="text-[9px] opacity-30">坚持记录，看见成长 ✨</p>
            </div>
          </div>
        </div>

        {/* Action buttons outside the card */}
        <div className="flex gap-2 mt-3">
          <Button
            onClick={handleScreenshot}
            className="flex-1 rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            <Camera className="w-4 h-4 mr-1.5" />
            保存截图
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-full border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
          >
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
