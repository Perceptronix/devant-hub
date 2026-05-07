export interface ImportedProject {
  id: string;
  owner: string;
  repo: string;
  name: string;
  description?: string;
  defaultBranch?: string;
  private?: boolean;
}

function storageKey(userId: string) {
  return `devant.importedProjects.${userId}`;
}

function selectedKey(userId: string) {
  return `devant.selectedProject.${userId}`;
}

export function getImportedProjects(userId: string): ImportedProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ImportedProject[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveImportedProjects(userId: string, projects: ImportedProject[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(projects));
}

export function addImportedProject(userId: string, project: ImportedProject): ImportedProject[] {
  const current = getImportedProjects(userId);
  const exists = current.some((p) => p.owner === project.owner && p.repo === project.repo);
  const next = exists ? current : [project, ...current];
  saveImportedProjects(userId, next);
  if (!getSelectedImportedProject(userId) && next.length > 0) {
    setSelectedImportedProject(userId, next[0]);
  }
  return next;
}

export function getSelectedImportedProject(userId: string): ImportedProject | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(selectedKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as ImportedProject;
  } catch {
    return null;
  }
}

export function setSelectedImportedProject(userId: string, project: ImportedProject) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(selectedKey(userId), JSON.stringify(project));
}
