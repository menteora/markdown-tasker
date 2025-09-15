export interface User {
  name: string;
  alias: string;
  avatarUrl: string;
  email: string;
}

export interface TaskUpdate {
  lineIndex: number;
  date: string;
  text: string;
  assigneeAlias: string | null;
}

export interface Task {
  lineIndex: number;
  text: string;
  completed: boolean;
  assigneeAlias: string | null;
  completionDate: string | null;
  updates: TaskUpdate[];
  projectTitle: string;
  cost?: number;
}

export interface GroupedTasks {
  [userAlias: string]: {
    user: User;
    tasks: Task[];
  };
}

export interface Project {
  title: string;
  groupedTasks: GroupedTasks;
  unassignedTasks: Task[];
  totalCost: number;
  startLine: number;
  endLine: number;
}

export interface Settings {
  senderName: string;
  emailPreamble: string;
  emailPostamble: string;
}
