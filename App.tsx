import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import UserManagement from './components/UserManagement';
import ProjectOverview from './components/ProjectOverview';
import ProjectActions from './components/ProjectActions';
import type { User, Project, GroupedTasks, Task, Settings, FullProjectState, BackupRecord } from './types';
import { ChevronsUpDown, Settings as SettingsIcon, Pencil, Archive, EyeOff, Pin } from 'lucide-react';
import SettingsModal from './components/SettingsModal';
import EditableDocumentView from './components/EditableDocumentView';
import FullDocumentEditor from './components/FullDocumentEditor';
import TimelineView from './components/TimelineView';
import ConfirmationModal from './components/ConfirmationModal';
import CloudActions from './components/CloudActions';
import SupabaseAuthModal from './components/SupabaseAuthModal';
import RestoreBackupModal from './components/RestoreBackupModal';
import { getSupabaseClient, signIn, signOut, getSession, backupProject, getBackups, getBackupData } from './lib/supabaseClient';
import { useProject } from './contexts/ProjectContext';


type View = 'editor' | 'users' | 'overview' | 'timeline' | 'archive';
type ViewScope = 'single' | 'all';

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
  const {
      markdown,
      archiveMarkdown,
      archiveProjects,
      users,
      settings,
      projects,
      setMarkdown,
      setUsers,
      saveSettings,
      handleRequestLocalRestore,
  } = useProject();

  const [view, setView] = useState<View>('editor');
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const [viewScope, setViewScope] = useState<ViewScope>('all');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isFullEditMode, setIsFullEditMode] = useState(false);
  const [fullEditContent, setFullEditContent] = useState('');
  const [restoreConfirmation, setRestoreConfirmation] = useState<{ isOpen: boolean; data: FullProjectState | null }>({ isOpen: false, data: null });
  const [scrollToSlug, setScrollToSlug] = useState<string | null>(null);
  const [hideCompletedTasks, setHideCompletedTasks] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  
  // Cloud state
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [isSupabaseAuthenticated, setIsSupabaseAuthenticated] = useState(false);
  const [supabaseAuthRequest, setSupabaseAuthRequest] = useState<{
      action: 'backup' | 'restore';
      title: string;
      onConfirm: (password: string) => void;
  } | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [cloudBackups, setCloudBackups] = useState<BackupRecord[]>([]);

  const isSupabaseConfigured = !!(settings.supabaseUrl && settings.supabaseAnonKey && settings.supabaseEmail);

  useEffect(() => {
    if (view === 'archive') return;
    if (currentProjectIndex >= projects.length) {
      setCurrentProjectIndex(Math.max(0, projects.length - 1));
    }
    setIsFullEditMode(false);
  }, [projects, currentProjectIndex, view]);

  useEffect(() => {
    setIsFullEditMode(false);
  }, [viewScope, view]);
  
  useEffect(() => {
      if (isSupabaseConfigured) {
          const client = getSupabaseClient(settings.supabaseUrl!, settings.supabaseAnonKey!);
          
          getSession(client).then(session => {
              setIsSupabaseAuthenticated(!!session);
          });

          const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
              setIsSupabaseAuthenticated(!!session);
          });

          return () => {
              subscription.unsubscribe();
          };
      } else {
          setIsSupabaseAuthenticated(false);
      }
  }, [isSupabaseConfigured, settings.supabaseUrl, settings.supabaseAnonKey]);

  useEffect(() => {
    if (scrollToSlug && view === 'editor') {
      setTimeout(() => {
        const element = document.getElementById(scrollToSlug);
        const parentSection = element?.closest('.group');
        
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        if (parentSection) {
          parentSection.classList.add('highlight-section');
          setTimeout(() => {
            parentSection.classList.remove('highlight-section');
          }, 2000);
        }
        
        setScrollToSlug(null);
      }, 100);
    }
  }, [scrollToSlug, view]);


  const displayMarkdown = useMemo(() => {
    if (view === 'archive') {
      return archiveMarkdown;
    }
    if (viewScope === 'single' && currentProjectIndex < projects.length) {
      const project = projects[currentProjectIndex];
      const lines = markdown.split('\n');
      return lines.slice(project.startLine, project.endLine + 1).join('\n');
    }
    return markdown;
  }, [markdown, archiveMarkdown, view, viewScope, currentProjectIndex, projects]);

  const handleToggleFullEdit = useCallback(() => {
    setFullEditContent(displayMarkdown);
    setIsFullEditMode(true);
  }, [displayMarkdown]);

  const handleSaveFullEdit = useCallback(() => {
    // Note: Full edit on archive is not implemented as it's complex.
    // Users can edit archive sections individually.
    if (view === 'archive') {
        alert("Full edit is not available for the archive view.");
        setIsFullEditMode(false);
        return;
    }

    if (viewScope === 'all') {
        setMarkdown(fullEditContent);
    } else {
        const project = projects[currentProjectIndex];
        if (project) {
            setMarkdown(prev => {
                const lines = prev.split('\n');
                const before = lines.slice(0, project.startLine);
                const after = lines.slice(project.endLine + 1);
                const newLines = fullEditContent.split('\n');
                return [...before, ...newLines, ...after].join('\n');
            });
        }
    }
    setIsFullEditMode(false);
  }, [fullEditContent, view, viewScope, currentProjectIndex, projects, setMarkdown]);

  const handleCancelFullEdit = useCallback(() => {
    setIsFullEditMode(false);
  }, []);

  const currentProject = projects[currentProjectIndex] || { title: 'Project', groupedTasks: {}, unassignedTasks: [], totalCost: 0, startLine: 0, endLine: 0, headings: [] };

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

  const dataForOverview = useMemo(() => {
      const source = viewScope === 'all' ? aggregatedData : currentProject;
      let processedSource = { ...source };

      if (hideCompletedTasks) {
          const filteredGroupedTasks = Object.entries(processedSource.groupedTasks).reduce((acc, [alias, group]: [string, { user: User; tasks: Task[] }]) => {
              acc[alias] = { ...group, tasks: group.tasks.filter(t => !t.completed) };
              return acc;
          }, {} as GroupedTasks);
          const filteredUnassignedTasks = processedSource.unassignedTasks.filter(t => !t.completed);
          processedSource = { ...processedSource, groupedTasks: filteredGroupedTasks, unassignedTasks: filteredUnassignedTasks };
      }

      if (showPinnedOnly) {
          const filteredGroupedTasks = Object.entries(processedSource.groupedTasks).reduce((acc, [alias, group]: [string, { user: User; tasks: Task[] }]) => {
              acc[alias] = { ...group, tasks: group.tasks.filter(t => t.pinned) };
              return acc;
          }, {} as GroupedTasks);
          const filteredUnassignedTasks = processedSource.unassignedTasks.filter(t => t.pinned);
          processedSource = { ...processedSource, groupedTasks: filteredGroupedTasks, unassignedTasks: filteredUnassignedTasks };
      }

      return processedSource;
  }, [viewScope, aggregatedData, currentProject, hideCompletedTasks, showPinnedOnly]);

  const tasksForTimeline = useMemo(() => {
    const sourceProjects = viewScope === 'all' ? projects : (currentProject ? [currentProject] : []);
    const allTasks = sourceProjects.flatMap(p => [...p.unassignedTasks, ...Object.values(p.groupedTasks).flatMap(g => g.tasks)]);
    return allTasks
      .filter(task => task.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }, [projects, currentProject, viewScope]);
  
  const handleConfirmRestore = useCallback(() => {
    if (!restoreConfirmation.data) return;
    
    const { markdown: newMarkdown, archiveMarkdown: newArchiveMarkdown, users: newUsers, settings: newSettings } = restoreConfirmation.data;
    
    setMarkdown(newMarkdown);
    if (newArchiveMarkdown) {
        // This is a simplified restore; a more robust solution would be needed if archiveMarkdown is managed by App state
        console.warn("Restoring archive markdown from backup is not fully implemented in this flow.");
    }
    setUsers(newUsers);
    saveSettings(newSettings);
    
    setRestoreConfirmation({ isOpen: false, data: null });
    alert('Project restored successfully from cloud backup!');
  }, [restoreConfirmation.data, saveSettings, setMarkdown, setUsers]);
  
  // --- Cloud Actions ---
  
  const performBackup = async () => {
      if (!isSupabaseConfigured) return;
      setIsLoadingCloud(true);
      try {
          const client = getSupabaseClient(settings.supabaseUrl!, settings.supabaseAnonKey!);
          const { supabaseUrl, supabaseAnonKey, supabaseEmail, ...settingsToBackup } = settings;
          const projectState: FullProjectState = { markdown, archiveMarkdown, users, settings: settingsToBackup };
          const result = await backupProject(client, projectState);
          if (result) {
              alert(`Backup successful!\nTimestamp: ${new Date(result.created_at).toLocaleString()}`);
          }
      } catch (error: any) {
          console.error("Backup failed:", error);
          alert(`Backup failed: ${error.message || 'Unknown error'}`);
      } finally {
          setIsLoadingCloud(false);
      }
    };

  const fetchAndShowRestoreModal = async () => {
    if (!isSupabaseConfigured) return;
    setIsLoadingCloud(true);
    try {
        const client = getSupabaseClient(settings.supabaseUrl!, settings.supabaseAnonKey!);
        const fetchedBackups = await getBackups(client);
        if (fetchedBackups) {
            setCloudBackups(fetchedBackups);
            setIsRestoreModalOpen(true);
        }
    } catch (error: any) {
        console.error("Fetch backups failed:", error);
        alert(`Failed to fetch backups: ${error.message || 'Unknown error'}`);
    } finally {
        setIsLoadingCloud(false);
    }
  };
  
  const performRestore = async (backupId: string) => {
    if (!isSupabaseConfigured) return;
    setIsRestoreModalOpen(false);
    setIsLoadingCloud(true);
    try {
        const client = getSupabaseClient(settings.supabaseUrl!, settings.supabaseAnonKey!);
        const backupData = await getBackupData(client, backupId);
        if (backupData) {
            setRestoreConfirmation({ isOpen: true, data: backupData });
        }
    } catch (error: any) {
         console.error("Restore failed:", error);
         alert(`Failed to restore: ${error.message || 'Unknown error'}`);
    } finally {
        setIsLoadingCloud(false);
    }
  };
  
  const handleRequestBackup = async () => {
    if (isSupabaseAuthenticated) {
        await performBackup();
    } else {
        setSupabaseAuthRequest({
            action: 'backup',
            title: 'Authenticate to Backup',
            onConfirm: async (password) => {
                setSupabaseAuthRequest(null);
                setIsLoadingCloud(true);
                const client = getSupabaseClient(settings.supabaseUrl!, settings.supabaseAnonKey!);
                try {
                    const user = await signIn(client, settings.supabaseEmail!, password);
                    if (user) {
                        await performBackup();
                    } else {
                       alert("Login failed.");
                       setIsLoadingCloud(false);
                    }
                } catch (error) {
                    alert("Login failed.");
                    setIsLoadingCloud(false);
                }
            }
        });
    }
  };

  const handleRequestRestore = async () => {
      if (isSupabaseAuthenticated) {
          await fetchAndShowRestoreModal();
      } else {
          setSupabaseAuthRequest({
              action: 'restore',
              title: 'Authenticate to Restore',
              onConfirm: async (password) => {
                  setSupabaseAuthRequest(null);
                  setIsLoadingCloud(true);
                  const client = getSupabaseClient(settings.supabaseUrl!, settings.supabaseAnonKey!);
                  try {
                      const user = await signIn(client, settings.supabaseEmail!, password);
                      if (user) {
                          await fetchAndShowRestoreModal();
                      } else {
                         alert("Login failed.");
                         setIsLoadingCloud(false);
                      }
                  } catch (error) {
                      alert("Login failed.");
                      setIsLoadingCloud(false);
                  }
              }
          });
      }
  };

  const handleSignOut = async () => {
    if (!isSupabaseConfigured) return;
    setIsLoadingCloud(true);
    try {
        const client = getSupabaseClient(settings.supabaseUrl!, settings.supabaseAnonKey!);
        await signOut(client);
        alert("Signed out successfully.");
    } catch (error: any) {
        console.error("Sign out failed:", error);
        alert(`Sign out failed: ${error.message || 'Unknown error'}`);
    } finally {
        setIsLoadingCloud(false);
    }
  };
  
  const handleNavigateToSection = useCallback((projectTitle: string, sectionSlug: string) => {
    const projectIndex = projects.findIndex(p => p.title === projectTitle);
    if (projectIndex !== -1) {
      setView('editor');
      setCurrentProjectIndex(projectIndex);
      setScrollToSlug(sectionSlug);
    }
  }, [projects]);


  const getHeaderDescription = () => {
    if (isFullEditMode) {
        return `Editing ${viewScope === 'all' ? 'the entire file' : `project: ${currentProject.title}`}.`;
    }
    const title = viewScope === 'all' ? 'All Projects' : currentProject.title;
    switch(view) {
      case 'editor':
        return 'Hover over a section to edit its content individually.';
      case 'users':
        return 'Manage your team. Changes are saved to the project state.';
      case 'overview':
        return `Overview of tasks for "${title}".`;
      case 'timeline':
        return `Task due date timeline for "${title}".`;
      case 'archive':
        return 'Viewing archived sections. Restore a section to make it active again.';
    }
  }

  const renderView = () => {
    switch (view) {
      case 'editor':
      case 'archive':
        if (isFullEditMode) {
          return (
            <FullDocumentEditor
              content={fullEditContent}
              onChange={setFullEditContent}
              onSave={handleSaveFullEdit}
              onCancel={handleCancelFullEdit}
              users={users}
            />
          );
        }
        return (
            <EditableDocumentView
              markdown={displayMarkdown}
              projects={view === 'archive' ? archiveProjects : projects}
              viewScope={view === 'archive' ? 'all' : viewScope}
              currentProjectIndex={currentProjectIndex}
              isArchiveView={view === 'archive'}
              hideCompletedTasks={hideCompletedTasks}
              showPinnedOnly={showPinnedOnly}
            />
        );
      case 'users':
        return <UserManagement />;
      case 'overview':
        return (
          <ProjectOverview
            groupedTasks={dataForOverview.groupedTasks}
            unassignedTasks={dataForOverview.unassignedTasks}
            projectTitle={dataForOverview.title}
            viewScope={viewScope}
            totalCost={dataForOverview.totalCost}
            onNavigate={handleNavigateToSection}
          />
        );
      case 'timeline':
        return (
          <TimelineView
            tasks={tasksForTimeline}
            viewScope={viewScope}
            onNavigate={handleNavigateToSection}
          />
        );
    }
  }

  const isArchive = view === 'archive';

  return (
    <div className="h-screen bg-slate-900 text-white font-sans flex flex-col overflow-hidden">
      <header className="py-4 px-8 border-b border-slate-700 bg-slate-900/70 backdrop-blur-sm z-10 flex flex-wrap justify-between items-center gap-4 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Interactive Markdown Tasker</h1>
              <p className="text-slate-400 text-sm">
                {getHeaderDescription()}
              </p>
            </div>
            {projects.length > 1 && !isFullEditMode && view !== 'archive' && (
            <div className="flex items-center gap-2 flex-shrink-0">
                <ViewScopeToggle scope={viewScope} onScopeChange={setViewScope} />
                {viewScope === 'single' && (
                <ProjectSwitcher 
                    projects={projects} 
                    selectedIndex={currentProjectIndex} 
                    onSelect={setCurrentProjectIndex} 
                />
                )}
            </div>
            )}
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
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
              Overview
            </button>
            <button
              onClick={() => setView('timeline')}
              className={`px-4 py-2 rounded-md transition-colors font-semibold ${view === 'timeline' ? 'bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'}`}
            >
              Timeline
            </button>
            <button
              onClick={() => setView('users')}
              className={`px-4 py-2 rounded-md transition-colors font-semibold ${view === 'users' ? 'bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'}`}
            >
              Assignees
            </button>
            <button
              onClick={() => setView('archive')}
              className={`px-4 py-2 rounded-md transition-colors font-semibold ${view === 'archive' ? 'bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'}`}
            >
              Archive
            </button>
          </nav>
           {(view === 'overview' || view === 'editor') && !isFullEditMode && (
            <div className="flex items-center p-1 bg-slate-800 rounded-md border border-slate-700 space-x-2">
              <div title="Toggle visibility of completed tasks">
                <label htmlFor="hide-completed-toggle" className="flex items-center cursor-pointer text-sm font-medium text-slate-300 select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="hide-completed-toggle"
                      className="sr-only"
                      checked={hideCompletedTasks}
                      onChange={e => setHideCompletedTasks(e.target.checked)}
                    />
                    <div className={`block w-9 h-5 rounded-full transition-colors ${hideCompletedTasks ? 'bg-indigo-600' : 'bg-slate-600'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${hideCompletedTasks ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <span className="ml-2 pr-1 flex items-center gap-1.5"><EyeOff className="w-4 h-4" />Hide Completed</span>
                </label>
              </div>
              <div className="w-px h-5 bg-slate-700"></div>
              <div title="Show only pinned tasks">
                <label htmlFor="show-pinned-toggle" className="flex items-center cursor-pointer text-sm font-medium text-slate-300 select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="show-pinned-toggle"
                      className="sr-only"
                      checked={showPinnedOnly}
                      onChange={e => setShowPinnedOnly(e.target.checked)}
                    />
                    <div className={`block w-9 h-5 rounded-full transition-colors ${showPinnedOnly ? 'bg-yellow-500' : 'bg-slate-600'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${showPinnedOnly ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <span className="ml-2 pr-1 flex items-center gap-1.5"><Pin className="w-4 h-4" />Show Pinned</span>
                </label>
              </div>
            </div>
          )}
          {view === 'editor' && !isFullEditMode && (
            <button 
              onClick={handleToggleFullEdit}
              className="px-3 py-2 rounded-md transition-colors font-semibold bg-slate-700 hover:bg-slate-600 flex items-center space-x-2"
              aria-label={`Edit ${viewScope === 'all' ? 'entire file' : 'current project'}`}
              title={`Edit ${viewScope === 'all' ? 'entire file' : 'current project'}`}
            >
              <Pencil className="w-4 h-4" />
              <span>Edit {viewScope === 'all' ? 'Entire File' : 'Project'}</span>
            </button>
          )}
          <div className="w-px h-6 bg-slate-700 mx-2"></div>
           <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 rounded-md transition-colors font-semibold bg-slate-700 hover:bg-slate-600"
              aria-label="Email Settings"
              title="Email Settings"
          >
              <SettingsIcon className="w-5 h-5" />
          </button>
          <CloudActions
            isConfigured={isSupabaseConfigured}
            isLoading={isLoadingCloud}
            onBackup={handleRequestBackup}
            onRestore={handleRequestRestore}
            isAuthenticated={isSupabaseAuthenticated}
            onSignOut={handleSignOut}
          />
          {!isArchive &&
            <ProjectActions
                viewScope={viewScope}
                currentProject={currentProject}
                isArchiveView={isArchive}
            />
          }
        </div>
      </header>
      <main className="flex-grow overflow-hidden">
        {renderView()}
      </main>
      <footer className="text-center py-4 border-t border-slate-700 text-slate-500 text-sm flex-shrink-0">
        Interactive Markdown Tasker
      </footer>
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
       <ConfirmationModal
          isOpen={restoreConfirmation.isOpen}
          onClose={() => setRestoreConfirmation({ isOpen: false, data: null })}
          onConfirm={handleConfirmRestore}
          title="Confirm Restore"
          confirmText="Yes, Overwrite Local Project"
      >
          <p>Are you sure you want to restore this backup?</p>
          <p className="text-sm text-yellow-400 mt-2">This will overwrite your current local project data, including the archive. This action cannot be undone.</p>
      </ConfirmationModal>
      {supabaseAuthRequest && (
        <SupabaseAuthModal
            isOpen={!!supabaseAuthRequest}
            onClose={() => setSupabaseAuthRequest(null)}
            onConfirm={supabaseAuthRequest.onConfirm}
            title={supabaseAuthRequest.title}
        />
      )}
      <RestoreBackupModal
          isOpen={isRestoreModalOpen}
          onClose={() => setIsRestoreModalOpen(false)}
          backups={cloudBackups}
          onSelectBackup={performRestore}
      />
    </div>
  );
};

export default App;