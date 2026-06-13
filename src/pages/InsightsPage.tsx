import { useState, useEffect } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Sparkles, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { getInsights, type AiInsight } from "@/lib/supabase-store";
import { cn } from "@/lib/utils";

// ─── Shared insight renderer (mirrors InsightReview / WeeklyInsight) ───

function InsightContent({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-[12px] leading-relaxed text-foreground/85">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("### "))
          return (
            <p key={i} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mt-3 mb-1 first:mt-0">
              {line.replace("### ", "")}
            </p>
          );
        if (line.startsWith("▸ ")) {
          const [head, ...rest] = line.replace("▸ ", "").split(" — ");
          return (
            <p key={i} className="flex gap-1.5">
              <span className="text-primary shrink-0 mt-px">▸</span>
              <span>
                {head}
                {rest.length > 0 && <span className="text-muted-foreground"> — {rest.join(" — ")}</span>}
              </span>
            </p>
          );
        }
        if (line.startsWith("— ") || line.startsWith("- "))
          return (
            <p key={i} className="pl-2 border-l-2 border-primary/30 py-0.5">
              {line.replace(/^[—-] /, "")}
            </p>
          );
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

// ─── Period label helpers ───

function dailyLabel(period: string): string {
  try {
    return format(new Date(period + "T12:00:00"), "M月d日 EEEE", { locale: zhCN });
  } catch {
    return period;
  }
}

function weeklyLabel(period: string): string {
  const [start, end] = period.split("_");
  try {
    return `${format(new Date(start + "T12:00:00"), "M/d")} ~ ${format(new Date(end + "T12:00:00"), "M/d")}`;
  } catch {
    return period;
  }
}

// ─── Insight card ───

function InsightCard({ insight }: { insight: AiInsight }) {
  const [expanded, setExpanded] = useState(false);

  const preview = insight.content
    .replace(/###[^\n]*/g, "")
    .replace(/▸[^\n]*/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 90);

  const isDaily = insight.type === "daily";
  const label = isDaily ? dailyLabel(insight.period) : weeklyLabel(insight.period);

  return (
    <div className={cn(
      "bg-card rounded-xl shadow-card overflow-hidden",
      isDaily ? "border-l-2 border-l-primary/50" : "border-l-2 border-l-orange-400/60"
    )}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4"
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            {isDaily
              ? <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              : <BookOpen className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            }
            <span className="text-xs font-semibold text-foreground">{label}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full",
              isDaily ? "bg-primary/10 text-primary" : "bg-orange-500/10 text-orange-600"
            )}>
              {isDaily ? "今日洞察" : "周回顾"}
            </span>
            {expanded
              ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            }
          </div>
        </div>
        {!expanded && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            {preview}…
          </p>
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 pt-0">
              <InsightContent text={insight.content} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ───

export default function InsightsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"daily" | "weekly">("daily");
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getInsights(user.id, tab)
      .then(setInsights)
      .catch(() => setInsights([]))
      .finally(() => setLoading(false));
  }, [user, tab]);

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold text-foreground">芦苇日志</h1>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5">AI 生成的洞察与回顾，自动保存</p>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-muted rounded-full p-0.5 mb-5">
        {(["daily", "weekly"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 text-[11px] py-2 rounded-full transition-all font-medium",
              tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            {t === "daily" ? "每日洞察" : "每周回顾"}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">{tab === "daily" ? "✨" : "📚"}</div>
          <p className="text-sm font-medium text-foreground mb-1">
            还没有{tab === "daily" ? "每日洞察" : "每周回顾"}
          </p>
          <p className="text-[11px] text-muted-foreground/60">
            在首页{tab === "daily" ? "生成今日洞察" : "生成每周回顾"}后会自动保存到这里
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}
