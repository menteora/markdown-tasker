

import React, { useState, useMemo, useCallback } from 'react';
import type { User, Task, GroupedTasks, Settings } from '../types';
import { CheckCircle2, Circle, Users, Mail, DollarSign, ListChecks, BarChart2, CalendarDays, Pencil } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { useProject } from '../contexts/ProjectContext';
import TaskEditModal from './TaskEditModal';

const formatMarkdownForEmail = (text: string): string => {
  const linkRegex = /\[(.*?)\]\((.*?)\)/g;
  return text.replace(linkRegex, (_match, linkText, url) => `${linkText} (${url})`);
};

const parseInlineMarkdown = (text: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g);
  
  return parts.map((part, index) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      return <a key={index} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{linkMatch[1]}</a>;
    }
    return part;
  });
};

const InlineMarkdown: React.FC<{ text: string }> = ({ text }) => {
    return <>{parseInlineMarkdown(text)}</>;
};

type ViewScope = 'single' | 'all';

interface ProjectOverviewProps {
  groupedTasks: GroupedTasks;
  unassignedTasks: Task[];
  projectTitle: string;
  viewScope: ViewScope;
  totalCost: number;
  onNavigate: (projectTitle: string, sectionSlug: string) => void;
}

const TaskItem: React.FC<{ 
    task: Task; 
    viewScope: ViewScope; 
    onEdit: (task: Task) => void;
    onNavigate: (projectTitle: string, sectionSlug: string) => void;
}> = ({ task, viewScope, onEdit, onNavigate }) => {
    const getDueDateInfo = (dateString: string | null, isCompleted: boolean): { color: string, label: string } | null => {
        if (!dateString || isCompleted) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(`${dateString}T00:00:00`);
        
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let color = 'bg-slate-700 text-slate-300';
        if (diffDays < 0) {
            color = 'bg-red-500/20 text-red-400';
        } else if (diffDays === 0) {
            color = 'bg-yellow-500/20 text-yellow-400';
        }
        
        return { color, label: dateString };
    };
  
    const dueDateInfo = getDueDateInfo(task.dueDate, task.completed);
    
    const contextPath = [
        viewScope === 'all' ? task.projectTitle : null,
        task.sectionTitle
    ].filter(Boolean).join(' > ');

    return (
      <div className="flex items-start space-x-3 group relative">
        {task.completed ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
        ) : (
          <Circle className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-grow min-w-0">
          <span className={`text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
            <InlineMarkdown text={task.text} />
          </span>
           {task.cost !== undefined && (
              <span className="ml-2 text-xs font-semibold bg-slate-700 text-green-400 px-2 py-0.5 rounded-full align-middle">
                ${task.cost.toFixed(2)}
              </span>
           )}
           {dueDateInfo && (
             <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full align-middle inline-flex items-center ${dueDateInfo.color}`}>
                <CalendarDays className="h-3 w-3 mr-1" />
                {dueDateInfo.label}
             </span>
           )}
           {contextPath && task.sectionSlug ? (
              <button 
                onClick={() => onNavigate(task.projectTitle, task.sectionSlug!)} 
                className="block text-xs text-indigo-400 font-medium mt-1 hover:underline text-left"
                title={`Go to section: ${task.sectionTitle}`}
              >
                {contextPath}
              </button>
            ) : viewScope === 'all' ? (
              <span className="block text-xs text-slate-500 font-medium mt-1">{task.projectTitle}</span>
            ) : null}
          {task.creationDate && (
            <span className="block text-xs text-slate-400">
              Created: {task.creationDate}
            </span>
          )}
          {task.completed && task.completionDate && (
            <span className="block text-xs text-slate-400">
              Completed: {task.completionDate}
            </span>
          )}
        </div>
        <div className="absolute top-0 right-0">
            <button
                onClick={() => onEdit(task)}
                className="p-1 rounded-full hover:bg-slate-700 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                aria-label="Edit task"
                title="Edit task"
            >
                <Pencil className="w-4 h-4" />
            </button>
        </div>
      </div>
    );
};

const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <div>
    <div className="flex justify-between mb-1">
      <span className="text-sm font-medium text-slate-400">Progress</span>
      <span className="text-sm font-medium text-slate-300">{Math.round(value)}%</span>
    </div>
    <div className="w-full bg-slate-700 rounded-full h-2.5">
      <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${value}%` }}></div>
    </div>
  </div>
);

const UserTaskCard: React.FC<{ 
    user: User; 
    tasks: Task[]; 
    projectTitle: string; 
    viewScope: ViewScope;
    onEditTask: (task: Task) => void;
    onNavigate: (projectTitle: string, sectionSlug: string) => void;
}> = ({ user, tasks, projectTitle, viewScope, onEditTask, onNavigate }) => {
  const { users, settings, addBulkTaskUpdates } = useProject();
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const incompleteTasks = tasks.filter(t => !t.completed);
  const totalCost = tasks.reduce((sum, task) => sum + (task.cost ?? 0), 0);

  const sender = useMemo(() => users.find(u => u.alias === settings.senderAlias), [users, settings.senderAlias]);
  const ccUser = useMemo(() => users.find(u => u.alias === settings.ccAlias), [users, settings.ccAlias]);

  const generateEmail = () => {
      if (incompleteTasks.length === 0) {
          alert(`No incomplete tasks for ${user.name}.`);
          return;
      }
      if (!user.email) {
          alert(`${user.name} does not have an email address configured.`);
          return;
      }

      const subject = settings.emailSubject.replace('{projectTitle}', projectTitle);
      
      const tasksByProject = incompleteTasks.reduce((acc, task) => {
          if (!acc[task.projectTitle]) acc[task.projectTitle] = [];
          acc[task.projectTitle].push(task);
          return acc;
      }, {} as Record<string, Task[]>);

      const projectTitles = Object.keys(tasksByProject);
      const taskListString = projectTitles
          .map(title => {
              const projectTasks = tasksByProject[title].map(task => {
                const costString = task.cost ? ` ($${task.cost.toFixed(2)})` : '';
                const creationDateString = task.creationDate ? ` (${settings.emailCreationDateLabel} ${new Date(task.creationDate + 'T00:00:00').toLocaleDateString()})` : '';
                const formattedText = formatMarkdownForEmail(task.text);
                return `- [ ] ${formattedText}${costString}${creationDateString}`;
              }).join('\n');
              return projectTitles.length > 1 ? `\nProject: ${title}\n${projectTasks}` : projectTasks;
          })
          .join('');
      
      const preamble = settings.emailPreamble.replace('{userName}', user.name.split(' ')[0] || user.name);
      const signature = settings.emailSignature.replace('{senderName}', sender?.name || 'The Team');

      const body = `${preamble}\n\n${taskListString}\n\n${settings.emailPostamble}\n${signature}`;
      
      const cc = ccUser?.email ? `&cc=${encodeURIComponent(ccUser.email)}` : '';
      const mailtoLink = `mailto:${user.email}?subject=${encodeURIComponent(subject)}${cc}&body=${encodeURIComponent(body)}`;

      window.open(mailtoLink, '_blank');
  };
  
  const handleConfirmSend = () => {
    const incompleteTaskIndexes = incompleteTasks.map(t => t.lineIndex);
    const updateText = settings.reminderMessage;
    addBulkTaskUpdates(incompleteTaskIndexes, updateText, settings.senderAlias);
    generateEmail();
    setIsConfirmationOpen(false);
  };

  const handleJustDraft = () => {
    generateEmail();
    setIsConfirmationOpen(false);
  }

  return (
    <>
      <div className="bg-slate-800 rounded-lg p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 min-w-0">
              <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="min-w-0">
                <h3 className="font-bold text-lg text-slate-100 truncate">{user.name}</h3>
                <p className="text-sm text-slate-400">{completedTasks} of {totalTasks} tasks completed</p>
                {totalCost > 0 && <p className="text-sm text-green-400 font-medium">${totalCost.toFixed(2)}</p>}
              </div>
          </div>
          {incompleteTasks.length > 0 && user.email && (
              <button
                  onClick={() => setIsConfirmationOpen(true)}
                  className="p-2 rounded-full bg-slate-700 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors flex-shrink-0"
                  title={`Draft an email to ${user.name}`}
                  aria-label={`Draft an email to ${user.name}`}
              >
                  <Mail className="h-5 w-5" />
              </button>
          )}
        </div>
        <div className="mb-6">
          <ProgressBar value={progress} />
        </div>
        <div className="space-y-3 overflow-y-auto flex-grow">
          {tasks.map((task, index) => (
            <TaskItem key={index} task={task} viewScope={viewScope} onEdit={onEditTask} onNavigate={onNavigate}/>
          ))}
        </div>
      </div>
      <ConfirmationModal
          isOpen={isConfirmationOpen}
          onClose={() => setIsConfirmationOpen(false)}
          onConfirm={handleConfirmSend}
          onSecondaryAction={handleJustDraft}
          title="Send Reminder"
          confirmText="Yes, add update"
          secondaryText="No, just draft email"
      >
          <p>Do you want to add an update note to the {incompleteTasks.length} pending task(s) for {user.name}?</p>
          {sender ? (
              <p className="text-sm text-slate-400 mt-2">The note will be assigned to <em className="text-slate-300">{sender.name}</em>.</p>
          ) : (
             <p className="text-sm text-slate-400 mt-2">The note will be added without an assignee.</p>
          )}
      </ConfirmationModal>
    </>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string; color: string }> = ({ icon, title, value, color }) => (
    <div className="bg-slate-800 rounded-lg p-4 flex items-center space-x-4">
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-slate-100">{value}</p>
        </div>
    </div>
);


const ProjectOverview: React.FC<ProjectOverviewProps> = ({ groupedTasks, unassignedTasks, projectTitle, viewScope, totalCost, onNavigate }) => {
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
  }, []);

  const handleCloseModal = useCallback(() => {
    setEditingTask(null);
  }, []);

  const allTasks = [...Object.values(groupedTasks).flatMap((g: { user: User; tasks: Task[] }) => g.tasks), ...unassignedTasks];
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.completed).length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const assignedUsersWithTasks = Object.values(groupedTasks).filter((group: { user: User; tasks: Task[] }) => group.tasks.length > 0);
  const unassignedCost = unassignedTasks.reduce((sum, task) => sum + (task.cost ?? 0), 0);

  return (
    <div className="p-8 overflow-y-auto h-full pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon={<ListChecks className="h-6 w-6 text-white"/>} title="Total Tasks" value={`${totalTasks}`} color="bg-blue-500" />
            <StatCard icon={<CheckCircle2 className="h-6 w-6 text-white"/>} title="Completed" value={`${completedTasks}`} color="bg-green-500" />
            <StatCard icon={<BarChart2 className="h-6 w-6 text-white"/>} title="Progress" value={`${Math.round(progress)}%`} color="bg-indigo-500" />
            <StatCard icon={<DollarSign className="h-6 w-6 text-white"/>} title="Total Cost" value={`$${totalCost.toFixed(2)}`} color="bg-yellow-500" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {assignedUsersWithTasks.map(({ user, tasks }) => (
          <UserTaskCard key={user.alias} user={user} tasks={tasks} projectTitle={projectTitle} viewScope={viewScope} onEditTask={handleEditTask} onNavigate={onNavigate} />
        ))}

        {unassignedTasks.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                    <div className="bg-slate-700 p-2 rounded-full">
                        <Users className="h-6 w-6 text-slate-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-100">Unassigned Tasks</h3>
                        <p className="text-sm text-slate-400">{unassignedTasks.length} tasks waiting</p>
                    </div>
                </div>
                 {unassignedCost > 0 && <p className="text-lg text-green-400 font-bold">${unassignedCost.toFixed(2)}</p>}
            </div>
            <div className="space-y-3">
              {unassignedTasks.map((task, index) => (
                <TaskItem key={index} task={task} viewScope={viewScope} onEdit={handleEditTask} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        )}
      </div>
      {assignedUsersWithTasks.length === 0 && unassignedTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <h2 className="text-2xl font-semibold">No Tasks Found</h2>
            <p>Your markdown file doesn't seem to have any tasks.</p>
            <p>Try adding a task like `- [ ] My new task` in the editor.</p>
        </div>
      )}
      {editingTask && (
        <TaskEditModal
            isOpen={!!editingTask}
            onClose={handleCloseModal}
            task={editingTask}
        />
      )}
    </div>
  );
};

export default ProjectOverview;