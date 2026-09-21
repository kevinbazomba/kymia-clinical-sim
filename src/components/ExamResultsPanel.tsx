import { ClipboardCheck } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/lib/i18n";

interface ExamRow { name: string; result: string; ts?: number; category?: string }

export function ExamResultsPanel({
  exams,
  className,
  height = "500px",
}: {
  exams: Record<string, ExamRow[]>;
  className?: string;
  height?: string;
}) {
  const { t } = useI18n();
  const LABELS: Record<string, string> = {
    physical: t("consultation.examResultsPanel.categories.physical"),
    biology: t("consultation.examResultsPanel.categories.biology"),
    imaging: t("consultation.examResultsPanel.categories.imaging"),
    custom: t("consultation.examResultsPanel.categories.custom"),
  };
  const total = Object.values(exams).reduce((s, l) => s + (l?.length ?? 0), 0);

  return (
    <div className={`rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)] ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-serif text-lg">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          {t("consultation.examResultsPanel.title")}
        </h3>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-primary">
          {total}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {t("consultation.examResultsPanel.help")}
      </p>

      <ScrollArea
        className="mt-3 rounded-lg border bg-background/50"
        style={{ height }}
      >
        <div className="space-y-4 p-3">
          {total === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {t("consultation.examResultsPanel.empty")}
            </p>
          )}
          {(["physical", "biology", "imaging", "custom"] as const).map((cat) => {
            const list = exams[cat] ?? [];
            if (!list.length) return null;
            return (
              <section key={cat}>
                <h4 className="sticky top-0 z-10 bg-background/95 pb-1 text-[11px] font-bold uppercase tracking-wider text-primary backdrop-blur">
                  {LABELS[cat] ?? cat} · {list.length}
                </h4>
                <div className="space-y-2">
                  {list.map((e, i) => (
                    <div key={`${cat}-${i}`} className="rounded-lg bg-secondary/50 p-3 text-xs">
                      <p className="font-semibold text-foreground">{e.name}</p>
                      <p className="mt-1 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                        {e.result}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
