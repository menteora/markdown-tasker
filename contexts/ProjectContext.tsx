import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { User, Project, Settings, FullProjectState } from '../types';
import { useMarkdownParser } from '../hooks/useMarkdownParser';
import { useSettings as useSettingsHook } from '../hooks/useSettings';
import { INITIAL_USERS } from '../constants';

const initialMarkdown = `# Project Titan Launch 🚀

This is a self-contained project file. Manage assignees in the "Manage Assignees" tab.
Use H1 headings (e.g., '# My Project') to create separate projects within this file.

## Phase 1: Design

- [ ] Wireframing and user flows !2024-08-10 (@alice) ($1500)
  - 2024-07-26: Initial sketches completed. (@alice)
  - 2024-07-27: Discussed with the product team, got feedback.
- [x] UI/UX Design system (@alice) ~2024-07-20 ($2500)
- [ ] Create brand style guide !2024-08-15 ($500)

## Phase 2: Development

- [ ] Setup CI/CD pipeline !2024-09-01 (@bob) ($2000)
- [ ] Develop core API endpoints !2024-08-25 (@charlie) ($4000)
- [ ] Frontend component library (@diana) ($3500)
- [ ] Implement user authentication ($1200)

# Project Phoenix: Q4 Initiatives 🦅

This is a second project within the same file. You can switch between projects using the dropdown in the header.

## Marketing & Outreach

- [ ] Plan social media campaign !2024-10-15 (@ethan) ($1800)
- [ ] Write blog posts for new features (@diana) ($750)

## Infrastructure Update

- [ ] Migrate database to new server !2024-11-01 (@bob) ($3000)
- [ ] Update server dependencies ($400)`;

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

interface ProjectContextType {
    markdown: string;
    setMarkdown: React.Dispatch<React.SetStateAction<string>>;
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    settings: Settings;
    saveSettings: (newSettings: Partial<Settings>) => void;
    projects: Project[];
    updateSection: (startLine: number, endLine: number, newContent: string) => void;
    toggleTask: (absoluteLineIndex: number, isCompleted: boolean) => void;
    updateTaskBlock: (absoluteStartLine: number, originalLineCount: number, newContent: string) => void;
    moveSection: (sectionToMove: {startLine: number, endLine: number}, destinationLine: number) => void;
    duplicateSection: (sectionToDuplicate: {startLine: number, endLine: number}, destinationLine: number) => void;
    addBulkTaskUpdates: (taskLineIndexes: number[], updateText: string, assigneeAlias: string | null) => void;
    addUser: (newUser: Omit<User, 'avatarUrl'>) => void;
    updateUser: (oldAlias: string, updatedUser: User) => void;
    deleteUser: (userAlias: string) => void;
    importProject: (file: File) => void;
    handleRequestLocalRestore: (data: FullProjectState) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [markdown, setMarkdown] = useState<string>(() => loadProjectFromStorage().markdown);
    const [users, setUsers] = useState<User[]>(() => loadProjectFromStorage().users);
    const [settings, saveSettings] = useSettingsHook();

    const projects = useMarkdownParser(markdown, users);

    useEffect(() => {
        try {
            const projectState = { markdown, users };
            localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projectState));
        } catch (error) {
            console.error('Failed to save project to localStorage:', error);
        }
    }, [markdown, users]);
    
    const updateSection = useCallback((startLine: number, endLine: number, newContent: string) => {
        setMarkdown(prev => {
            const lines = prev.split('\n');
            const before = lines.slice(0, startLine);
            const after = lines.slice(endLine + 1);
            const newLines = newContent.split('\n');
            return [...before, ...newLines, ...after].join('\n');
        });
    }, []);

    const updateTaskBlock = useCallback((absoluteStartLine: number, originalLineCount: number, newContent: string) => {
        setMarkdown(prev => {
            const lines = prev.split('\n');
            const before = lines.slice(0, absoluteStartLine);
            const after = lines.slice(absoluteStartLine + originalLineCount);
            const newLines = newContent.split('\n');
            return [...before, ...newLines, ...after].join('\n');
        });
    }, []);

    const toggleTask = useCallback((absoluteLineIndex: number, isCompleted: boolean) => {
        setMarkdown(prevMarkdown => {
            const lines = prevMarkdown.split('\n');
            if (absoluteLineIndex >= lines.length) return prevMarkdown;
            const line = lines[absoluteLineIndex];

            const dateRegex = /\s~([0-9]{4}-[0-9]{2}-[0-9]{2})/;
            let newLine = line.replace(dateRegex, '');

            if (isCompleted) {
                const today = new Date().toISOString().split('T')[0];
                newLine = `${newLine.trim()} ~${today}`;
            }
            
            const taskRegex = /^- \[( |x)\]/;
            newLine = newLine.replace(taskRegex, `- [${isCompleted ? 'x' : ' '}]`);
            
            lines[absoluteLineIndex] = newLine;
            return lines.join('\n');
        });
    }, []);

    const moveSection = useCallback((sectionToMove: {startLine: number, endLine: number}, destinationLine: number) => {
        setMarkdown(prev => {
            const lines = prev.split('\n');
            const sectionContent = lines.slice(sectionToMove.startLine, sectionToMove.endLine + 1);
            const linesWithoutSection = [
                ...lines.slice(0, sectionToMove.startLine),
                ...lines.slice(sectionToMove.endLine + 1)
            ];
            const adjustedDestinationLine = destinationLine > sectionToMove.startLine 
                ? destinationLine - sectionContent.length 
                : destinationLine;
            const contentToInsert = [...sectionContent];
            if (adjustedDestinationLine > 0 && linesWithoutSection[adjustedDestinationLine - 1]?.trim() !== '') {
                contentToInsert.unshift('');
            }
            if (adjustedDestinationLine < linesWithoutSection.length && linesWithoutSection[adjustedDestinationLine]?.trim() !== '') {
                contentToInsert.push('');
            }
            const newLines = [
                ...linesWithoutSection.slice(0, adjustedDestinationLine),
                ...contentToInsert,
                ...linesWithoutSection.slice(adjustedDestinationLine)
            ];
            return newLines.join('\n');
        });
    }, []);

    const duplicateSection = useCallback((sectionToDuplicate: {startLine: number, endLine: number}, destinationLine: number) => {
        setMarkdown(prev => {
            const lines = prev.split('\n');
            const sectionContent = lines.slice(sectionToDuplicate.startLine, sectionToDuplicate.endLine + 1);
            const newLines = [
                ...lines.slice(0, destinationLine),
                ...sectionContent,
                ...lines.slice(destinationLine)
            ];
            return newLines.join('\n');
        });
    }, []);

    const addBulkTaskUpdates = useCallback((taskLineIndexes: number[], updateText: string, assigneeAlias: string | null) => {
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

    const updateUser = useCallback((oldAlias: string, updatedUser: User) => {
        setUsers(prevUsers => prevUsers.map(u => u.alias === oldAlias ? updatedUser : u));
        if (oldAlias !== updatedUser.alias) {
            setMarkdown(prevMarkdown => {
                const searchRegex = new RegExp(`\\(@${oldAlias}\\)`, 'g');
                return prevMarkdown.replace(searchRegex, `(@${updatedUser.alias})`);
            });
        }
    }, []);

    const deleteUser = useCallback((userAlias: string) => {
        setUsers(prevUsers => prevUsers.filter(u => u.alias !== userAlias));
        setMarkdown(prevMarkdown => {
            const unassignRegex = new RegExp(`\\s\\(@${userAlias}\\)`, 'g');
            return prevMarkdown.replace(unassignRegex, '');
        });
    }, []);

    const addUser = useCallback((newUser: Omit<User, 'avatarUrl'>) => {
        if (users.some(u => u.alias === newUser.alias)) {
            alert(`Alias "@${newUser.alias}" is already taken. Please choose a unique alias.`);
            return;
        }
        const avatarUrl = `https://picsum.photos/seed/${newUser.alias}/40/40`;
        setUsers(prev => [...prev, { ...newUser, avatarUrl }]);
    }, [users]);
      
    const importProject = useCallback((file: File) => {
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

    const handleRequestLocalRestore = useCallback((data: FullProjectState) => {
        // This function will be handled by App.tsx to show a modal
        // But the core logic could live here if we introduce a modal context
    }, []);

    const value: ProjectContextType = {
        markdown,
        setMarkdown,
        users,
        setUsers,
        settings,
        saveSettings,
        projects,
        updateSection,
        toggleTask,
        updateTaskBlock,
        moveSection,
        duplicateSection,
        addBulkTaskUpdates,
        addUser,
        updateUser,
        deleteUser,
        importProject,
        handleRequestLocalRestore,
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = (): ProjectContextType => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
};
