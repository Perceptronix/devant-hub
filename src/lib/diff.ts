/** Parse a unified-diff `patch` string from the GitHub API into structured hunks. */

export type DiffLine =
  | { type: "context"; oldNo: number; newNo: number; content: string }
  | { type: "add"; oldNo: null; newNo: number; content: string }
  | { type: "del"; oldNo: number; newNo: null; content: string }
  | { type: "hunk"; oldNo: null; newNo: null; content: string };

export interface DiffHunk {
  header: string;
  oldStart: number;
  newStart: number;
  lines: DiffLine[];
}

export function parsePatch(patch: string | null | undefined): DiffHunk[] {
  if (!patch) return [];
  const lines = patch.split("\n");
  const hunks: DiffHunk[] = [];
  let cur: DiffHunk | null = null;
  let oldNo = 0;
  let newNo = 0;

  for (const raw of lines) {
    if (raw.startsWith("@@")) {
      const m = raw.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      const oldStart = m ? parseInt(m[1], 10) : 1;
      const newStart = m ? parseInt(m[2], 10) : 1;
      cur = { header: raw, oldStart, newStart, lines: [{ type: "hunk", oldNo: null, newNo: null, content: raw }] };
      hunks.push(cur);
      oldNo = oldStart;
      newNo = newStart;
      continue;
    }
    if (!cur) continue;
    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      cur.lines.push({ type: "add", oldNo: null, newNo, content: raw.slice(1) });
      newNo++;
    } else if (raw.startsWith("-") && !raw.startsWith("---")) {
      cur.lines.push({ type: "del", oldNo, newNo: null, content: raw.slice(1) });
      oldNo++;
    } else {
      const content = raw.startsWith(" ") ? raw.slice(1) : raw;
      cur.lines.push({ type: "context", oldNo, newNo, content });
      oldNo++;
      newNo++;
    }
  }
  return hunks;
}
