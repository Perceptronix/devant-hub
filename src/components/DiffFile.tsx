import { type DiffHunk, parsePatch } from "@/lib/diff";
import hljs from "highlight.js/lib/common";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

function detectLang(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
    json: "json", md: "markdown", css: "css", html: "xml", yml: "yaml", yaml: "yaml",
    sh: "bash", sql: "sql", c: "c", h: "c", cpp: "cpp", hpp: "cpp",
  };
  return map[ext] || "plaintext";
}

function highlight(code: string, lang: string): string {
  try {
    return hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang }).value : hljs.highlightAuto(code).value;
  } catch {
    return code;
  }
}

export function DiffFile({ filename, status, additions, deletions, patch }: {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string | null;
}) {
  const hunks: DiffHunk[] = useMemo(() => parsePatch(patch ?? null), [patch]);
  const lang = detectLang(filename);

  const statusColor: Record<string, string> = {
    added: "text-success bg-success/10",
    modified: "text-warning bg-warning/10",
    removed: "text-danger bg-danger/10",
    renamed: "text-cyan bg-cyan/10",
  };

  return (
    <div className="glass rounded-xl overflow-hidden mb-4">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-surface">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("text-[10px] uppercase font-bold px-1.5 py-0.5 rounded", statusColor[status] || "bg-muted text-muted-foreground")}>
            {status}
          </span>
          <span className="font-mono text-xs truncate">{filename}</span>
        </div>
        <div className="flex items-center gap-2 text-xs shrink-0">
          <span className="text-success">+{additions}</span>
          <span className="text-danger">-{deletions}</span>
        </div>
      </div>

      {hunks.length === 0 ? (
        <div className="px-4 py-6 text-xs text-muted-foreground font-mono">Binary file or no patch available.</div>
      ) : (
        <div className="overflow-x-auto scrollbar-thin font-mono text-[12px] leading-5">
          {hunks.map((hunk, hi) => (
            <div key={hi}>
              {hunk.lines.map((ln, i) => {
                const bg =
                  ln.type === "add" ? "bg-success/10" :
                  ln.type === "del" ? "bg-danger/10" :
                  ln.type === "hunk" ? "bg-primary/10 text-primary" : "";
                const sign = ln.type === "add" ? "+" : ln.type === "del" ? "-" : ln.type === "hunk" ? "" : " ";
                const html = ln.type === "hunk" ? ln.content : highlight(ln.content, lang);
                return (
                  <div key={i} className={cn("flex hover:bg-surface-elevated/50", bg)}>
                    <div className="w-10 sticky left-0 px-1 text-right text-muted-foreground select-none border-r border-border bg-surface/60 shrink-0">
                      {ln.oldNo ?? ""}
                    </div>
                    <div className="w-10 sticky left-10 px-1 text-right text-muted-foreground select-none border-r border-border bg-surface/60 shrink-0">
                      {ln.newNo ?? ""}
                    </div>
                    <div className="w-4 px-1 text-center select-none shrink-0">{sign}</div>
                    <pre
                      className="flex-1 whitespace-pre pr-4"
                      dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
