

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
  creationDate?: string | null;
  completionDate: string | null;
  dueDate?: string | null;
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

export interface Heading {
  text: string;
  slug: string;
  level: number;
  line: number;
}

export interface Project {
  title: string;
  groupedTasks: GroupedTasks;
  unassignedTasks: Task[];
  totalCost: number;
  startLine: number;
  endLine: number;
  headings: Heading[];
}

export interface Settings {
  senderAlias: string | null;
  emailSubject: string;
  emailPreamble: string;
  emailPostamble: string;
  emailSignature: string;
  reminderMessage: string;
  ccAlias?: string | null;
  supabaseUrl?: string | null;
  supabaseAnonKey?: string | null;
  supabaseEmail?: string | null;
}

export interface BackupRecord {
    id: string;
    created_at: string;
    client_name?: string;
}

export interface FullProjectState {
    markdown: string;
    archiveMarkdown?: string;
    users: User[];
    settings: Omit<Settings, 'supabaseUrl' | 'supabaseAnonKey' | 'supabaseEmail'>;
}