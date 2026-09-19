export type IssueStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done" | "canceled";
export type IssuePriority = "no_priority" | "low" | "medium" | "high" | "urgent";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  github_login: string;
  avatar_url?: string;
  role?: string;
}

export interface IssueActivity {
  id: string;
  issue_id: string;
  user_name: string;
  user_avatar?: string;
  action: string;
  timestamp: string;
}

export interface Issue {
  id: string;          // e.g. "DEV-101"
  raw_id?: string;     // DB UUID
  title: string;
  description?: string;
  status: IssueStatus;
  priority: IssuePriority;
  labels: string[];
  assigned_to?: TeamMember;
  created_by: TeamMember;
  project_id: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  activities?: IssueActivity[];
}

export interface IssueFilter {
  status: string;        // "all" | IssueStatus
  priority: string;      // "all" | IssuePriority
  assigneeId: string;    // "all" | "unassigned" | userId
  label: string;         // "all" | labelName
  searchQuery: string;
  viewMode: "list" | "board";
  sidebarView: "all" | "active" | "backlog" | "my_issues";
}
