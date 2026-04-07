import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ModuleDetail from "@/components/ModuleDetail";
import type { ModuleKey } from "@/lib/modules";
import { MODULES } from "@/lib/modules";

export default function ModuleDetailPage() {
  const { moduleKey } = useParams<{ moduleKey: string }>();
  const navigate = useNavigate();

  const module = MODULES.find((m) => m.key === moduleKey);
  if (!module) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">模块未找到</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
      </div>

      <ModuleDetail moduleKey={moduleKey as ModuleKey} />
    </div>
  );
}
