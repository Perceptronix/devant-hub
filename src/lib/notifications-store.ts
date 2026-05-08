const KEY = "devant.notifications.read";

function load(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export function getReadIds(): Set<string> { return load(); }

export function markRead(ids: string[]) {
  if (typeof window === "undefined") return;
  const cur = load();
  ids.forEach((id) => cur.add(id));
  window.localStorage.setItem(KEY, JSON.stringify(Array.from(cur)));
  window.dispatchEvent(new CustomEvent("devant:notifications-changed"));
}

export function unreadCount(allIds: string[]): number {
  const read = load();
  let n = 0;
  for (const id of allIds) if (!read.has(id)) n++;
  return n;
}
