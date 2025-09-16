

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Editor from './components/Editor';
import Preview from './components/Preview';
import UserManagement from './components/UserManagement';
import ProjectOverview from './components/ProjectOverview';
import ProjectActions from './components/ProjectActions';
import type { User, Project, GroupedTasks, Task, Settings } from './types';
import { useMarkdownParser } from './hooks/useMarkdownParser';
import { INITIAL_USERS } from './constants';
import saveAs from 'file-saver';
import { ChevronsUpDown, Settings as SettingsIcon } from 'lucide-react';
import { useSettings } from './hooks/useSettings';
import SettingsModal from './components/SettingsModal';

const initialMarkdown = `# Project Titan Launch 🚀

This is a self-contained project file. Manage assignees in the "Manage Assignees" tab.
Use H1 headings (e.g., '# My Project') to create separate projects within this file.

## Phase 1: Design

- [ ] Wireframing and user flows (@alice) ($1500)
  - 2024-07-26: Initial sketches completed. (@alice)
  - 2024-07-27: Discussed with the product team, got feedback.
- [x] UI/UX Design system (@alice) ~2024-07-20 ($2500)
- [ ] Create brand style guide ($500)

## Phase 2: Development

- [ ] Setup CI/CD pipeline (@bob) ($2000)
- [ ] Develop core API endpoints (@charlie) ($4000)
- [ ] Frontend component library (@diana) ($3500)
- [ ] Implement user authentication ($1200)

# Project Phoenix: Q4 Initiatives 🦅

This is a second project within the same file. You can switch between projects using the dropdown in the header.

## Marketing & Outreach

- [ ] Plan social media campaign (@ethan) ($1800)
- [ ] Write blog posts for new features (@diana) ($750)

## Infrastructure Update

- [ ] Migrate database to new server (@bob) ($3000)
- [ ] Update server dependencies ($400)`;

type View = 'editor' | 'users' | 'overview';
type ViewScope = 'single' | 'all';

const PROJECT_STORAGE_KEY = 'md-tasker-project-state';

const loadProjectFromStorage = () => {
    try {
        const storedState = localStorage.getItem(PROJECT_STORAGE_KEY);
        if (storedState) {
            const data = JSON.parse(storedState);
            if (data && typeof data.markdown === 'string' && Array.isArray(data.users)) {
                return { markdown: data.markdown, users: data.users };
            }
        }
    } catch (error) {
        console.error('Failed to load project from localStorage:', error);
    }
    return { markdown: initialMarkdown, users: INITIAL_USERS };
};


const ProjectSwitcher: React.FC<{
  projects: Project[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}> = ({ projects, selectedIndex, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (index: number) => {
    onSelect(index);
    setIsOpen(false);
  }

  const selectedProject = projects[selectedIndex];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(p => !p)}
        className="flex items-center justify-between w-64 px-3 py-2 text-left bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Current project: ${selectedProject?.title}. Click to switch projects.`}
      >
        <span className="truncate text-sm font-medium text-slate-200">{selectedProject?.title}</span>
        <ChevronsUpDown className="w-4 h-4 text-slate-400 ml-2 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30" role="menu">
          <div className="p-1">
            {projects.map((project, index) => (
              <button
                key={index}
                onClick={() => handleSelect(index)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md ${selectedIndex === index ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-700'}`}
                role="menuitem"
              >
                {project.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ViewScopeToggle: React.FC<{ scope: ViewScope; onScopeChange: (scope: ViewScope) => void; }> = ({ scope, onScopeChange }) => {
  return (
    <div className="flex items-center p-1 bg-slate-800 rounded-md border border-slate-700">
      <button
        onClick={() => onScopeChange('single')}
        className={`px-3 py-1 text-sm font-medium rounded transition-colors ${scope === 'single' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
        aria-pressed={scope === 'single'}
      >
        Current Project
      </button>
      <button
        onClick={() => onScopeChange('all')}
        className={`px-3 py-1 text-sm font-medium rounded transition-colors ${scope === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
        aria-pressed={scope === 'all'}
      >
        All Projects
      </button>
    </div>
  );
};


const App: React.FC = () => {
  const [markdown, setMarkdown] = useState<string>(() => loadProjectFromStorage().markdown);
  const [users, setUsers] = useState<User[]>(() => loadProjectFromStorage().users);
  const [view, setView] = useState<View>('editor');
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const [viewScope, setViewScope] = useState<ViewScope>('all');
  const [settings, saveSettings] = useSettings();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const projects = useMarkdownParser(markdown, users);
  
  useEffect(() => {
    try {
        const projectState = { markdown, users };
        localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projectState));
    } catch (error) {
        console.error('Failed to save project to localStorage:', error);
    }
  }, [markdown, users]);

  useEffect(() => {
    if (currentProjectIndex >= projects.length) {
      setCurrentProjectIndex(Math.max(0, projects.length - 1));
    }
  }, [projects, currentProjectIndex]);

  const { displayMarkdown, markdownOffset } = useMemo(() => {
    if (viewScope === 'single' && currentProjectIndex < projects.length) {
      const project = projects[currentProjectIndex];
      const lines = markdown.split('\n');
      return {
        displayMarkdown: lines.slice(project.startLine, project.endLine + 1).join('\n'),
        markdownOffset: project.startLine,
      };
    }
    return {
      displayMarkdown: markdown,
      markdownOffset: 0,
    };
  }, [markdown, viewScope, currentProjectIndex, projects]);

  const currentProject = projects[currentProjectIndex] || { title: 'Project', groupedTasks: {}, unassignedTasks: [], totalCost: 0, startLine: 0, endLine: 0 };

  const aggregatedData = useMemo(() => {
      const allGroupedTasks: GroupedTasks = users.reduce((acc, user) => {
          acc[user.alias] = { user, tasks: [] };
          return acc;
      }, {} as GroupedTasks);
      const allUnassignedTasks: Task[] = [];
      let totalCost = 0;

      projects.forEach(project => {
          allUnassignedTasks.push(...project.unassignedTasks);
          totalCost += project.totalCost;
          Object.values(project.groupedTasks).forEach(({ user, tasks }) => {
              if (allGroupedTasks[user.alias]) {
                  allGroupedTasks[user.alias].tasks.push(...tasks);
              }
          });
      });
      return { title: "All Projects", groupedTasks: allGroupedTasks, unassignedTasks: allUnassignedTasks, totalCost };
  }, [projects, users]);

  const dataForOverview = viewScope === 'all' ? aggregatedData : currentProject;

  const handleEditorChange = (newContent: string) => {
    if (viewScope === 'single' && currentProjectIndex < projects.length) {
      const project = projects[currentProjectIndex];
      const originalLines = markdown.split('\n');
      
      const beforeLines = originalLines.slice(0, project.startLine);
      const afterLines = originalLines.slice(project.endLine + 1);
      
      const newLines = newContent.split('\n');
      
      setMarkdown([...beforeLines, ...newLines, ...afterLines].join('\n'));
    } else {
      setMarkdown(newContent);
    }
  };

  const handleAssign = useCallback((relativeLineIndex: number, userAlias: string | null) => {
    const lineIndex = relativeLineIndex + markdownOffset;
    setMarkdown(prevMarkdown => {
      const lines = prevMarkdown.split('\n');
      if (lineIndex >= lines.length) return prevMarkdown;
      const line = lines[lineIndex];
      
      const assigneeRegex = /\s\(@[a-zA-Z0-9_]+\)/;
      const dateRegex = /\s~([0-9]{4}-[0-9]{2}-[0-9]{2})$/;
      const costRegex = /\s\(\$(\d+(\.\d{1,2})?)\)$/;

      let newLine = line;

      const dateMatch = newLine.match(dateRegex);
      if (dateMatch) newLine = newLine.replace(dateRegex, '');

      const costMatch = newLine.match(costRegex);
      if (costMatch) newLine = newLine.replace(costRegex, '');
      
      if (assigneeRegex.test(newLine)) {
        newLine = newLine.replace(assigneeRegex, '');
      }
      
      if (userAlias) {
        newLine = `${newLine.trim()} (@${userAlias})`;
      }

      if (costMatch) newLine = `${newLine}${costMatch[0]}`;
      if (dateMatch) newLine = `${newLine}${dateMatch[0]}`;
      
      lines[lineIndex] = newLine;
      return lines.join('\n');
    });
  }, [markdownOffset]);

  const handleToggle = useCallback((relativeLineIndex: number, isCompleted: boolean) => {
    const lineIndex = relativeLineIndex + markdownOffset;
    setMarkdown(prevMarkdown => {
        const lines = prevMarkdown.split('\n');
        if (lineIndex >= lines.length) return prevMarkdown;
        const line = lines[lineIndex];

        const dateRegex = /\s~([0-9]{4}-[0-9]{2}-[0-9]{2})$/;
        let newLine = line.replace(dateRegex, '');

        if (isCompleted) {
            const today = new Date().toISOString().split('T')[0];
            newLine = `${newLine.trim()} ~${today}`;
        }
        
        const taskRegex = /^- \[( |x)\]/;
        newLine = newLine.replace(taskRegex, `- [${isCompleted ? 'x' : ' '}]`);
        
        lines[lineIndex] = newLine;
        return lines.join('\n');
    });
  }, [markdownOffset]);

  const handleUpdateCompletionDate = useCallback((relativeLineIndex: number, newDate: string) => {
    const lineIndex = relativeLineIndex + markdownOffset;
    setMarkdown(prevMarkdown => {
        const lines = prevMarkdown.split('\n');
        if (lineIndex >= lines.length) return prevMarkdown;
        const line = lines[lineIndex];
        const dateRegex = /~([0-9]{4}-[0-9]{2}-[0-9]{2})$/;
        
        lines[lineIndex] = line.replace(dateRegex, `~${newDate}`);
        return lines.join('\n');
    });
  }, [markdownOffset]);

  const handleUpdateCreationDate = useCallback((relativeLineIndex: number, newDate: string) => {
    const lineIndex = relativeLineIndex + markdownOffset;
    setMarkdown(prevMarkdown => {
        const lines = prevMarkdown.split('\n');
        if (lineIndex >= lines.length) return prevMarkdown;
        const line = lines[lineIndex];
        const dateRegex = /\+([0-9]{4}-[0-9]{2}-[0-9]{2})/;
        
        if (dateRegex.test(line)) {
            lines[lineIndex] = line.replace(dateRegex, `+${newDate}`);
        } else {
            // Add if it doesn't exist
             const taskPrefixRegex = /^- \[( |x)\] /;
            lines[lineIndex] = line.replace(taskPrefixRegex, `$&+${newDate} `);
        }
        return lines.join('\n');
    });
  }, [markdownOffset]);

  const handleAddTaskUpdate = useCallback((relativeTaskLineIndex: number, updateText: string, assigneeAlias: string | null) => {
    const taskLineIndex = relativeTaskLineIndex + markdownOffset;
    setMarkdown(prevMarkdown => {
        const lines = prevMarkdown.split('\n');
        const today = new Date().toISOString().split('T')[0];
        const assigneeString = assigneeAlias ? ` (@${assigneeAlias})` : '';
        const newUpdateLine = `  - ${today}: ${updateText}${assigneeString}`;

        let insertAt = taskLineIndex + 1;
        const updateRegex = /^  - \d{4}-\d{2}-\d{2}: .*/;
        while (insertAt < lines.length && (updateRegex.test(lines[insertAt]) || lines[insertAt].trim() === '')) {
            if (updateRegex.test(lines[insertAt])) {
                 insertAt++;
            } else {
                break;
            }
        }

        lines.splice(insertAt, 0, newUpdateLine);
        return lines.join('\n');
    });
  }, [markdownOffset]);
  
  const handleAddBulkTaskUpdates = useCallback((taskLineIndexes: number[], updateText: string, assigneeAlias: string | null) => {
    setMarkdown(prevMarkdown => {
        const lines = prevMarkdown.split('\n');
        const today = new Date().toISOString().split('T')[0];
        const assigneeString = assigneeAlias ? ` (@${assigneeAlias})` : '';
        const newUpdateLine = `  - ${today}: ${updateText}${assigneeString}`;
        const updateRegex = /^  - \d{4}-\d{2}-\d{2}: .*/;
        
        const sortedIndexes = [...taskLineIndexes].sort((a, b) => b - a);

        for (const taskLineIndex of sortedIndexes) {
            let insertAt = taskLineIndex + 1;
            while (insertAt < lines.length && (updateRegex.test(lines[insertAt]) || lines[insertAt].trim() === '')) {
                if (updateRegex.test(lines[insertAt])) {
                    insertAt++;
                } else {
                    break;
                }
            }
            lines.splice(insertAt, 0, newUpdateLine);
        }
        return lines.join('\n');
    });
  }, []);

  const handleUpdateTaskUpdate = useCallback((relativeUpdateLineIndex: number, newDate: string, newText: string, newAlias: string | null) => {
      const updateLineIndex = relativeUpdateLineIndex + markdownOffset;
      setMarkdown(prevMarkdown => {
          const lines = prevMarkdown.split('\n');
          if (updateLineIndex < lines.length) {
              const assigneeString = newAlias ? ` (@${newAlias})` : '';
              lines[updateLineIndex] = `  - ${newDate}: ${newText}${assigneeString}`;
          }
          return lines.join('\n');
      });
  }, [markdownOffset]);

  const handleDeleteTaskUpdate = useCallback((relativeUpdateLineIndex: number) => {
      const updateLineIndex = relativeUpdateLineIndex + markdownOffset;
      setMarkdown(prevMarkdown => {
          const lines = prevMarkdown.split('\n');
          if (updateLineIndex < lines.length) {
              lines.splice(updateLineIndex, 1);
          }
          return lines.join('\n');
      });
  }, [markdownOffset]);

  const handleUpdateUser = useCallback((oldAlias: string, updatedUser: User) => {
    setUsers(prevUsers => prevUsers.map(u => u.alias === oldAlias ? updatedUser : u));

    if (oldAlias !== updatedUser.alias) {
        setMarkdown(prevMarkdown => {
            const searchRegex = new RegExp(`\\(@${oldAlias}\\)`, 'g');
            return prevMarkdown.replace(searchRegex, `(@${updatedUser.alias})`);
        });
    }
  }, []);

  const handleDeleteUser = useCallback((userAlias: string) => {
    setUsers(prevUsers => prevUsers.filter(u => u.alias !== userAlias));
    
    setMarkdown(prevMarkdown => {
        const unassignRegex = new RegExp(`\\s\\(@${userAlias}\\)`, 'g');
        return prevMarkdown.replace(unassignRegex, '');
    });
  }, []);

  const handleAddUser = useCallback((newUser: Omit<User, 'avatarUrl'>) => {
    if (users.some(u => u.alias === newUser.alias)) {
      alert(`Alias "@${newUser.alias}" is already taken. Please choose a unique alias.`);
      return;
    }
    const avatarUrl = `https://picsum.photos/seed/${newUser.alias}/40/40`;
    setUsers(prev => [...prev, { ...newUser, avatarUrl }]);
  }, [users]);
  
  const handleExportProject = useCallback(() => {
    const projectData = { users, markdown, settings };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const filename = projects.length > 1 ? 'Multi-Project.mdtasker' : `${currentProject.title.replace(/\s/g, '_')}.mdtasker`;
    saveAs(blob, filename);
  }, [users, markdown, settings, projects, currentProject.title]);
  
  const handleImportProject = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target?.result as string;
            const data = JSON.parse(content);
            if (data && Array.isArray(data.users) && typeof data.markdown === 'string') {
                setUsers(data.users);
                setMarkdown(data.markdown);
                if (data.settings) {
                    saveSettings(data.settings as Settings);
                }
                setCurrentProjectIndex(0);
                setViewScope('all');
                alert('Project imported successfully!');
            } else {
                alert('Invalid project file format.');
            }
        } catch (error) {
            console.error("Failed to parse project file", error);
            alert('Failed to read or parse the project file.');
        }
    };
    reader.readAsText(file);
  }, [saveSettings]);

  const getHeaderDescription = () => {
    switch(view) {
      case 'editor':
        if(viewScope === 'single') return `Editing project: "${currentProject.title}".`;
        return 'Edit markdown on the left, assign tasks on the right.';
      case 'users':
        return 'Manage your team. Changes are saved to the project state.';
      case 'overview':
        const title = viewScope === 'all' ? 'All Projects' : currentProject.title;
        return `Overview of tasks for "${title}".`;
    }
  }

  const renderView = () => {
    switch (view) {
      case 'editor':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            <Editor 
              value={displayMarkdown} 
              onChange={handleEditorChange} 
              users={users}
            />
            <Preview 
              markdown={displayMarkdown}
              onAssign={handleAssign}
              onToggle={handleToggle}
              onUpdateCompletionDate={handleUpdateCompletionDate}
              onUpdateCreationDate={handleUpdateCreationDate}
              onAddTaskUpdate={handleAddTaskUpdate}
              onUpdateTaskUpdate={handleUpdateTaskUpdate}
              onDeleteTaskUpdate={handleDeleteTaskUpdate}
              users={users}
            />
          </div>
        );
      case 'users':
        return (
          <UserManagement
            users={users}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
          />
        );
      case 'overview':
        return (
          <ProjectOverview
            groupedTasks={dataForOverview.groupedTasks}
            unassignedTasks={dataForOverview.unassignedTasks}
            projectTitle={dataForOverview.title}
            viewScope={viewScope}
            totalCost={dataForOverview.totalCost}
            users={users}
            settings={settings}
            onAddBulkTaskUpdates={handleAddBulkTaskUpdates}
          />
        );
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col">
      <header className="py-4 px-8 border-b border-slate-700 bg-slate-900/70 backdrop-blur-sm sticky top-0 z-10 flex justify-between items-center">
        <div>
           <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-100">Interactive Markdown Tasker</h1>
            {projects.length > 1 && (
              <>
                <ViewScopeToggle scope={viewScope} onScopeChange={setViewScope} />
                {viewScope === 'single' && (
                  <ProjectSwitcher 
                    projects={projects} 
                    selectedIndex={currentProjectIndex} 
                    onSelect={setCurrentProjectIndex} 
                  />
                )}
              </>
            )}
          </div>
          <p className="text-slate-400">
            {getHeaderDescription()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <nav className="flex space-x-2">
            <button
              onClick={() => setView('editor')}
              className={`px-4 py-2 rounded-md transition-colors font-semibold ${view === 'editor' ? 'bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'}`}
            >
              Editor
            </button>
            <button
              onClick={() => setView('overview')}
              className={`px-4 py-2 rounded-md transition-colors font-semibold ${view === 'overview' ? 'bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'}`}
            >
              Project Overview
            </button>
            <button
              onClick={() => setView('users')}
              className={`px-4 py-2 rounded-md transition-colors font-semibold ${view === 'users' ? 'bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'}`}
            >
              Manage Assignees
            </button>
          </nav>
          <div className="w-px h-6 bg-slate-700 mx-2"></div>
           <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 rounded-md transition-colors font-semibold bg-slate-700 hover:bg-slate-600"
              aria-label="Email Settings"
              title="Email Settings"
          >
              <SettingsIcon className="w-5 h-5" />
          </button>
          <ProjectActions
              markdown={markdown}
              projects={projects}
              users={users}
              onExportProject={handleExportProject}
              onImportProject={handleImportProject}
              viewScope={viewScope}
              currentProject={currentProject}
          />
        </div>
      </header>
      <main className="flex-grow h-[calc(100vh-125px)]">
        {renderView()}
      </main>
      <footer className="text-center py-4 border-t border-slate-700 text-slate-500 text-sm">
        Interactive Markdown Tasker
      </footer>
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSave={saveSettings}
        users={users}
      />
    </div>
  );
};

export default App;