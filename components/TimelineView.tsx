import React, { useMemo } from 'react';
import type { User, Task } from '../types';
import { CheckCircle2, Circle, AlertTriangle, Calendar, Clock, Inbox, ArrowRight } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';

type ViewScope = 'single' | 'all';

interface TimelineViewProps {
  tasks: Task[];
  viewScope: ViewScope;
}

const parseInlineMarkdown = (text: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g);
  return parts.map((part, index) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) return <a key={index} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{linkMatch[1]}</a>;
    return part;
  });
};
const InlineMarkdown: React.FC<{ text: string }> = ({ text }) => <>{parseInlineMarkdown(text)}</>;

const TimelineTaskItem: React.FC<{ task: Task; user: User | null; viewScope: ViewScope }> = ({ task, user, viewScope }) => {
  return (
    <div className="flex items-start space-x-3 p-3 bg-slate-800/50 rounded-md">
      {task.completed ? (
        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
      ) : (
        <Circle className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-grow min-w-0">
        <p className={`text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
          <InlineMarkdown text={task.text} />
        </p>
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
          {user && (
            <div className="flex items-center space-x-1">
              <img src={user.avatarUrl} alt={user.name} className="h-4 w-4 rounded-full" />
              <span>{user.name}</span>
            </div>
          )}
          {viewScope === 'all' && <span className="font-medium text-indigo-400">{task.projectTitle}</span>}
        </div>
      </div>
      <span className="text-xs font-mono whitespace-nowrap text-slate-400">{task.dueDate}</span>
    </div>
  );
};

const TimelineSection: React.FC<{ title: string; icon: React.ReactNode; tasks: Task[]; viewScope: ViewScope; }> = ({ title, icon, tasks, viewScope }) => {
    const { users } = useProject();
    const userByAlias = useMemo(() => new Map(users.map(u => [u.alias, u])), [users]);
    if (tasks.length === 0) return null;
    return (
        <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="font-bold text-lg text-slate-100 flex items-center mb-4">
                {icon}
                <span className="ml-2">{title}</span>
                <span className="ml-auto text-sm font-normal bg-slate-700 text-slate-300 rounded-full px-2.5 py-0.5">{tasks.length}</span>
            </h3>
            <div className="space-y-2">
                {tasks.map(task => (
                    <TimelineTaskItem
                        key={task.lineIndex}
                        task={task}
                        user={task.assigneeAlias ? userByAlias.get(task.assigneeAlias) ?? null : null}
                        viewScope={viewScope}
                    />
                ))}
            </div>
        </div>
    );
};

const TimelineView: React.FC<TimelineViewProps> = ({ tasks, viewScope }) => {
  const groupedTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const overdue: Task[] = [];
    const dueToday: Task[] = [];
    const thisWeek: Task[] = [];
    const thisMonth: Task[] = [];
    const later: Task[] = [];

    tasks.forEach(task => {
      if (!task.dueDate) return;
      const dueDate = new Date(`${task.dueDate}T00:00:00`);

      if (task.completed) return; // Optionally hide completed tasks

      if (dueDate < today) {
        overdue.push(task);
      } else if (dueDate.getTime() === today.getTime()) {
        dueToday.push(task);
      } else if (dueDate > today && dueDate <= endOfWeek) {
        thisWeek.push(task);
      } else if (dueDate > endOfWeek && dueDate <= endOfMonth) {
        thisMonth.push(task);
      } else {
        later.push(task);
      }
    });

    return { overdue, dueToday, thisWeek, thisMonth, later };
  }, [tasks]);

  if (tasks.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Inbox className="w-16 h-16 mb-4" />
            <h2 className="text-2xl font-semibold">No Tasks with Due Dates</h2>
            <p>This timeline shows tasks with a 'due date'.</p>
            <p>Try adding a due date like `!YYYY-MM-DD` to a task in the editor.</p>
        </div>
    );
  }

  return (
    <div className="p-8 overflow-y-auto h-full pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <TimelineSection
              title="Overdue"
              icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
              tasks={groupedTasks.overdue}
              viewScope={viewScope}
          />
           <TimelineSection
              title="Due Today"
              icon={<Calendar className="w-5 h-5 text-yellow-400" />}
              tasks={groupedTasks.dueToday}
              viewScope={viewScope}
          />
           <TimelineSection
              title="This Week"
              icon={<ArrowRight className="w-5 h-5 text-blue-400" />}
              tasks={groupedTasks.thisWeek}
              viewScope={viewScope}
          />
          <TimelineSection
              title="This Month"
              icon={<Clock className="w-5 h-5 text-indigo-400" />}
              tasks={groupedTasks.thisMonth}
              viewScope={viewScope}
          />
          <TimelineSection
              title="Later"
              icon={<Inbox className="w-5 h-5 text-slate-400" />}
              tasks={groupedTasks.later}
              viewScope={viewScope}
          />
      </div>
    </div>
  );
};

export default TimelineView;
