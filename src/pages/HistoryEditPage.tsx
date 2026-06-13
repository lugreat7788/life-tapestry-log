import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { format, parse } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CORE_MODULES, BONUS_MODULES } from "@/lib/modules";
import ModuleDetail from "@/components/ModuleDetail";
import type { ModuleKey } from "@/lib/modules";
import { useAuth } from "@/hooks/useAuth";
import { getDailyLog } from "@/lib/supabase-store";
import { buildDayMarkdown, downloadMarkdown } from "@/lib/export";

export default function HistoryEditPage() {
  const { dateStr } = useParams<{ dateStr: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [logData, setLogData] = useState<any>(null);

  const date = dateStr ? parse(dateStr, "yyyy-MM-dd", new Date()) : new Date();
  const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
  const displayDate = format(date, "yyyy年M月d日 EEEE", { locale: zhCN });

  useEffect(() => {
    if (!user || !dateStr) return;
    getDailyLog(user.id, date).then((log) => {
      if (log.totalPoints > 0 || Object.keys(log.entries).length > 0) {
        setLogData(log);
      }
    });
  }, [user, dateStr]);

  if (!dateStr) return null;

  const handleExport = () => {
    if (!logData) return;
    const md = buildDayMarkdown(logData, date, CORE_MODULES, BONUS_MODULES);
    downloadMarkdown(`LifeLog_${dateStr}.md`, md);
  };

  return (
    <div className="max-w-lg mx-auto pb-8">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/stats")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回统计
          </button>
          {logData && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-3 py-1.5 rounded-lg transition-colors"
              title="导出为 Markdown"
            >
              <Download className="w-3.5 h-3.5" />
              导出 MD
            </button>
          )}
        </div>
        <h1 className="text-lg font-display font-bold text-foreground mt-3">
          {isToday ? "今天" : displayDate}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isToday ? displayDate : "点击项目可补填或修改记录"}
        </p>
      </div>

      <div className="mt-2">
        <h2 className="px-4 text-xs font-medium text-muted-foreground mb-2 uppercase tracking-widest">每日必修</h2>
        {CORE_MODULES.map((mod) => (
          <ModuleDetail key={mod.key} moduleKey={mod.key as ModuleKey} date={date} />
        ))}
      </div>

      <div className="mt-4">
        <h2 className="px-4 text-xs font-medium text-primary mb-2 uppercase tracking-widest">成长加分</h2>
        {BONUS_MODULES.map((mod) => (
          <ModuleDetail key={mod.key} moduleKey={mod.key as ModuleKey} date={date} />
        ))}
      </div>
    </div>
  );
}
