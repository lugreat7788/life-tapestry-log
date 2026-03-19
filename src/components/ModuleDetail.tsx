import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MODULES, getModuleMaxPoints } from "@/lib/modules";
import type { ModuleKey } from "@/lib/modules";
import { getDailyLog, toggleEntry, updateEntryNotes } from "@/lib/supabase-store";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useEffect, useCallback } from "react";
import type { DailyLog } from "@/lib/store-types";

interface ModuleDetailProps {
  moduleKey: ModuleKey;
}

export default function ModuleDetail({ moduleKey }: ModuleDetailProps) {
  const module = MODULES.find((m) => m.key === moduleKey)!;
  const { user } = useAuth();
  const [log, setLog] = useState<DailyLog>({ date: "", entries: {}, totalPoints: 0 });

  const loadLog = useCallback(async () => {
    if (!user) return;
    const data = await getDailyLog(user.id);
    setLog(data);
  }, [user]);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  const earnedPoints = module.items.reduce(
    (sum, item) => sum + (log.entries[item.id]?.completed ? item.points : 0),
    0
  );

  const handleToggle = async (itemId: string, points: number) => {
    if (!user) return;
    await toggleEntry(user.id, moduleKey, itemId, points);
    await loadLog();
  };

  const handleNotes = async (itemId: string, notes: string) => {
    if (!user) return;
    await updateEntryNotes(user.id, itemId, moduleKey, notes);
    await loadLog();
  };

  return (
    <div className="px-4 pt-4 pb-6">
      <div className={cn("rounded-xl p-5 mb-6", module.bgClass)}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{module.icon}</span>
          <div>
            <h1 className={cn("text-xl font-display font-bold", module.fgClass)}>
              {module.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {earnedPoints} / {getModuleMaxPoints(module)} 分已获得
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {module.items.map((item) => {
          const entry = log.entries[item.id];
          const isCompleted = entry?.completed;

          return (
            <Drawer key={item.id}>
              <div
                className={cn(
                  "bg-card rounded-xl shadow-card overflow-hidden transition-all duration-200",
                  isCompleted && "ring-1 ring-primary/20"
                )}
              >
                <div className="flex items-center p-4 gap-3">
                  <button
                    onClick={() => handleToggle(item.id, item.points)}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0",
                      isCompleted
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30 hover:border-primary/50"
                    )}
                  >
                    <AnimatePresence>
                      {isCompleted && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>

                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "font-medium text-sm transition-all duration-200",
                        isCompleted && "line-through text-muted-foreground"
                      )}
                    >
                      {item.name}
                    </p>
                    {entry?.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {entry.notes}
                      </p>
                    )}
                  </div>

                  <span className={cn("text-xs font-medium px-2 py-1 rounded-full", module.bgClass, module.fgClass)}>
                    +{item.points}分
                  </span>

                  <DrawerTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground p-1">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </DrawerTrigger>
                </div>
              </div>

              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle className="flex items-center gap-2">
                    <span>{module.icon}</span>
                    {item.name}
                  </DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-8">
                  <Textarea
                    placeholder="记录你的心得、感想..."
                    defaultValue={entry?.notes || ""}
                    onBlur={(e) => handleNotes(item.id, e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                </div>
              </DrawerContent>
            </Drawer>
          );
        })}
      </div>
    </div>
  );
}
