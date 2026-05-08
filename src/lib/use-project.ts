import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { fetchImportedProjects, type ImportedProject } from "./imported-projects";
import { useSyncListener } from "./sync";

export function useProject(projectId: string | undefined) {
  const { user } = useAuth();
  const [project, setProject] = useState<ImportedProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useSyncListener(() => setTick((n) => n + 1));

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user || !projectId) { setProject(null); setLoading(false); return; }
      setLoading(true);
      const list = await fetchImportedProjects(user.id);
      if (!mounted) return;
      setProject(list.find((p) => p.id === projectId) ?? null);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [user, projectId, tick]);

  return { project, loading };
}
