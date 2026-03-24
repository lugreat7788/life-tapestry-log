import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { format, parse } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CORE_MODULES, BONUS_MODULES } from "@/lib/modules";
import ModuleDetail from "@/components/ModuleDetail";
import type { ModuleKey } from "@/lib/modules";

export default function HistoryEditPage() {
  const { dateStr } = useParams<{ dateStr: string }>();
  const navigate = useNavigate();

  if (!dateStr) return null;

  const date = parse(dateStr, "yyyy-MM-dd", new Date());
  const displayDate = format(date, "yyyy年M月d日 EEEE", { locale: zhCN });
  const isToday = dateStr === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="max-w-lg mx-auto pb-8">
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={() => navigate("/stats")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回统计
        </button>
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
