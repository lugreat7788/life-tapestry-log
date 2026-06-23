// Shared renderer for 芦苇 AI insight / review text.
// Light markdown-like formatting on the agreed markers:
//   "### "  → section heading
//   "▸ "    → action item (head — detail)
//   "— "/"- " → Socratic question or quoted line (left-accent border)
// Used by InsightReview (daily), WeeklyInsight (weekly), and InsightsPage (archive).

interface InsightContentProps {
  text: string;
}

export default function InsightContent({ text }: InsightContentProps) {
  return (
    <div className="space-y-1.5 text-[12px] leading-relaxed text-foreground/85">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("### ")) {
          return (
            <p
              key={i}
              className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mt-3 mb-1 first:mt-0"
            >
              {line.replace("### ", "")}
            </p>
          );
        }
        if (line.startsWith("▸ ")) {
          const [head, ...rest] = line.replace("▸ ", "").split(" — ");
          return (
            <p key={i} className="flex gap-1.5">
              <span className="text-primary shrink-0 mt-px">▸</span>
              <span>
                {head}
                {rest.length > 0 && (
                  <span className="text-muted-foreground"> — {rest.join(" — ")}</span>
                )}
              </span>
            </p>
          );
        }
        if (line.startsWith("— ") || line.startsWith("—") || line.startsWith("- ")) {
          return (
            <p key={i} className="pl-2 border-l-2 border-primary/40 py-0.5 text-foreground/90">
              {line.replace(/^[—-]\s?/, "")}
            </p>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}
