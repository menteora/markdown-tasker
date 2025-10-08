import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { User, Project, Settings, FullProjectState, Task } from '../types';
import { useMarkdownParser } from '../hooks/useMarkdownParser';
import { useSettings as useSettingsHook } from '../hooks/useSettings';
import { INITIAL_USERS } from '../constants';
import { remark } from 'remark';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { visit, EXIT } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import type { Root, Content, Heading, List, ListItem, Paragraph, Text, PhrasingContent } from 'mdast';

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

const initialArchiveMarkdown = ``;

const PROJECT_STORAGE_KEY = 'md-tasker-project-state-v2';

const processor = remark()
    .use(remarkGfm)
    .use(remarkStringify, {
        bullet: '-',
        listItemIndent: 'one',
        rule: '-',
        tightDefinitions: true,
        emphasis: '*',
    });

const loadProjectFromStorage = () => {
    try {
        const storedState = localStorage.getItem(PROJECT_STORAGE_KEY);
        if (storedState) {
            const data = JSON.parse(storedState);
            if (data && typeof data.markdown === 'string' && Array.isArray(data.users)) {
                return {
                    markdown: data.markdown,
                    users: data.users,
                    archiveMarkdown: data.archiveMarkdown || initialArchiveMarkdown
                };
            }
        }
    } catch (error) {
        console.error('Failed to load project from localStorage:', error);
    }
    return { markdown: initialMarkdown, users: INITIAL_USERS, archiveMarkdown: initialArchiveMarkdown };
};

interface ProjectContextType {
    markdown: string;
    setMarkdown: React.Dispatch<React.SetStateAction<string>>;
    archiveMarkdown: string;
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    settings: Settings;
    saveSettings: (newSettings: Partial<Settings>) => void;
    projects: Project[];
    archiveProjects: Project[];
    updateSection: (startLine: number, endLine: number, newContent: string, isArchive: boolean) => void;
    toggleTask: (absoluteLineIndex: number, isCompleted: boolean) => void;
    updateTaskBlock: (absoluteStartLine: number, originalLineCount: number, newContent: string, isArchive: boolean) => void;
    moveSection: (sectionToMove: { startLine: number, endLine: number }, destinationLine: number) => void;
    duplicateSection: (sectionToDuplicate: { startLine: number, endLine: number }, destinationLine: number) => void;
    addBulkTaskUpdates: (taskLineIndexes: number[], updateText: string, assigneeAlias: string | null) => void;
    addUser: (newUser: Omit<User, 'avatarUrl'>) => void;
    updateUser: (oldAlias: string, updatedUser: User) => void;
    deleteUser: (userAlias: string) => void;
    importProject: (file: File) => void;
    handleRequestLocalRestore: (data: FullProjectState) => void;
    archiveSection: (section: { startLine: number, endLine: number }, projectTitle: string) => void;
    restoreSection: (section: { startLine: number, endLine: number }) => void;
    archiveTasks: (tasksToArchive: Task[]) => void;
    reorderTask: (taskToMove: Task, direction: 'up' | 'down' | 'top' | 'bottom') => void;
    clearArchive: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const loadedState = useMemo(() => loadProjectFromStorage(), []);
    const [markdown, setMarkdown] = useState<string>(loadedState.markdown);
    const [archiveMarkdown, setArchiveMarkdown] = useState<string>(loadedState.archiveMarkdown);
    const [users, setUsers] = useState<User[]>(loadedState.users);
    const [settings, saveSettings] = useSettingsHook();

    const projects = useMarkdownParser(markdown, users);
    const archiveProjects = useMarkdownParser(archiveMarkdown, users);

    useEffect(() => {
        try {
            const projectState = { markdown, archiveMarkdown, users };
            localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projectState));
        } catch (error) {
            console.error('Failed to save project to localStorage:', error);
        }
    }, [markdown, archiveMarkdown, users]);
    
    const performAstUpdate = useCallback((
        updater: (tree: Root) => Root | void,
        isArchive = false
    ) => {
        const sourceMd = isArchive ? archiveMarkdown : markdown;
        const setter = isArchive ? setArchiveMarkdown : setMarkdown;

        try {
            const tree = processor.parse(sourceMd);
            const result = updater(tree);
            let newMd = processor.stringify(result || tree);
            
            // FIX: After stringifying, remark escapes underscores in aliases (e.g., @user_name becomes @user\_name).
            // This regex finds all alias blocks `(@...)` and un-escapes only the underscores within them.
            newMd = newMd.replace(/\(@([^)]+)\)/g, (match) => {
                return match.replace(/\\_/g, '_');
            });

            setter(newMd);
        } catch (error) {
            console.error("Failed to perform AST update:", error);
        }
    }, [markdown, archiveMarkdown]);

    const updateSection = useCallback((startLine: number, endLine: number, newContent: string, isArchive: boolean) => {
        performAstUpdate(tree => {
            const newSectionTree = processor.parse(newContent);
    
            const startNodeIndex = tree.children.findIndex(node => node.position && node.position.start.line - 1 >= startLine);
    
            if (startNodeIndex === -1) {
                if (startLine === 0) {
                    tree.children.unshift(...newSectionTree.children);
                }
                return;
            }
    
            let endNodeIndex = -1;
            for (let i = tree.children.length - 1; i >= startNodeIndex; i--) {
                const node = tree.children[i];
                if (node.position && node.position.start.line - 1 <= endLine) {
                    endNodeIndex = i;
                    break;
                }
            }
    
            if (endNodeIndex === -1) {
                 endNodeIndex = startNodeIndex;
            }
    
            const nodesToRemove = endNodeIndex - startNodeIndex + 1;
            tree.children.splice(startNodeIndex, nodesToRemove, ...newSectionTree.children);
        }, isArchive);
    }, [performAstUpdate]);

    const updateTaskBlock = useCallback((absoluteStartLine: number, originalLineCount: number, newContent: string, isArchive: boolean) => {
        performAstUpdate(tree => {
            let taskNode: ListItem | null = null;
            let taskNodeIndex: number | null = null;
            let parentList: List | null = null;
    
            visit(tree, 'listItem', (node: ListItem, index, parent) => {
                if (node.position?.start.line - 1 === absoluteStartLine) {
                    taskNode = node;
                    taskNodeIndex = index;
                    parentList = parent as List;
                    return EXIT;
                }
            });
    
            if (taskNode === null || taskNodeIndex === null || !parentList) {
                console.error("Could not find the task to update in the AST at line:", absoluteStartLine);
                return;
            }
    
            const newAst = processor.parse(newContent);
            const newList = newAst.children.find(child => child.type === 'list') as List;
    
            if (!newList || !newList.children || newList.children.length === 0) {
                console.error("Could not parse new task content into a valid list item.");
                if (newAst.children[0]?.type === 'paragraph' && taskNode.children.some(c => c.type === 'paragraph')) {
                    const listItemParagraph = taskNode.children.find(c => c.type === 'paragraph') as Paragraph;
                    listItemParagraph.children = (newAst.children[0] as Paragraph).children;
                }
                return;
            }
    
            const newItems = newList.children as ListItem[];
            parentList.children.splice(taskNodeIndex, 1, ...newItems);
    
        }, isArchive);
    }, [performAstUpdate]);

    const toggleTask = useCallback((absoluteLineIndex: number, isCompleted: boolean) => {
        performAstUpdate(tree => {
            visit(tree, 'listItem', (node: ListItem) => {
                if (node.position?.start.line - 1 === absoluteLineIndex && typeof node.checked === 'boolean') {
                    node.checked = isCompleted;

                    const paragraph = node.children.find(child => child.type === 'paragraph') as Paragraph | undefined;

                    if (!paragraph) return EXIT;
                    
                    paragraph.children.forEach(child => {
                        if (child.type === 'text') {
                            child.value = child.value.replace(/\s*~[0-9]{4}-[0-9]{2}-[0-9]{2}/g, '');
                        }
                    });

                    paragraph.children = paragraph.children.filter(child => !(child.type === 'text' && child.value.trim() === ''));

                    if (isCompleted) {
                        const today = new Date().toISOString().split('T')[0];
                        let lastChild = paragraph.children[paragraph.children.length - 1];

                        if (lastChild && lastChild.type === 'text') {
                            lastChild.value = `${lastChild.value.trimEnd()} ~${today}`;
                        } else {
                            paragraph.children.push({ type: 'text', value: ` ~${today}` });
                        }
                    }

                    return EXIT;
                }
            });
        });
    }, [performAstUpdate]);

    const moveOrDuplicateSection = useCallback((
        sectionLines: { startLine: number; endLine: number },
        destinationLine: number,
        isDuplicate: boolean
    ) => {
        performAstUpdate(tree => {
            const { startLine, endLine } = sectionLines;
            let startIndex = -1, endIndex = -1;

            tree.children.forEach((node, index) => {
                if (node.position) {
                    if (node.position.start.line - 1 >= startLine && startIndex === -1) startIndex = index;
                    if (node.position.end.line - 1 <= endLine) endIndex = index;
                }
            });

            if (startIndex === -1 || endIndex === -1) return;

            const sectionNodes = tree.children.slice(startIndex, endIndex + 1);
            if (!isDuplicate) {
                tree.children.splice(startIndex, sectionNodes.length);
            }

            let destinationIndex = tree.children.findIndex(node => node.position && node.position.start.line - 1 >= destinationLine);
            if (destinationIndex === -1) destinationIndex = tree.children.length;
            
            const nodesToInsert = isDuplicate ? JSON.parse(JSON.stringify(sectionNodes)) : sectionNodes;
            tree.children.splice(destinationIndex, 0, ...nodesToInsert);
        });
    }, [performAstUpdate]);
    
    const moveSection = useCallback((sectionToMove, destinationLine) => {
        moveOrDuplicateSection(sectionToMove, destinationLine, false);
    }, [moveOrDuplicateSection]);

    const duplicateSection = useCallback((sectionToDuplicate, destinationLine) => {
        moveOrDuplicateSection(sectionToDuplicate, destinationLine, true);
    }, [moveOrDuplicateSection]);
    
    const findOrCreateHierarchicalInsertionIndex = (root: Root, hierarchy: { text: string; level: number }[]): number => {
        let parentHeadingIndex = -1;
        let parentHeadingLevel = 0;
        let insertionPoint = 0;

        for (const currentHeading of hierarchy) {
            const searchRangeStart = parentHeadingIndex + 1;
            
            const nextHigherOrEqualHeadingIndex = root.children.findIndex(
                (node, idx) => idx >= searchRangeStart && node.type === 'heading' && node.depth <= parentHeadingLevel
            );
            const searchRangeEnd = nextHigherOrEqualHeadingIndex === -1 ? root.children.length : nextHigherOrEqualHeadingIndex;

            const foundHeadingIndexInSlice = root.children.slice(searchRangeStart, searchRangeEnd).findIndex(
                node => node.type === 'heading' && node.depth === currentHeading.level && toString(node).trim() === currentHeading.text
            );

            let foundHeadingIndex = foundHeadingIndexInSlice !== -1 ? foundHeadingIndexInSlice + searchRangeStart : -1;

            if (foundHeadingIndex === -1) {
                const newHeadingNode: Heading = {
                    type: 'heading',
                    depth: currentHeading.level,
                    children: [{ type: 'text', value: currentHeading.text }]
                };
                
                insertionPoint = searchRangeEnd;
                root.children.splice(insertionPoint, 0, newHeadingNode);
                foundHeadingIndex = insertionPoint;
            }

            parentHeadingIndex = foundHeadingIndex;
            parentHeadingLevel = currentHeading.level;
            insertionPoint = parentHeadingIndex + 1;
        }

        return insertionPoint;
    };

    const findOrCreateHierarchicalList = (root: Root, hierarchy: { text: string; level: number }[]): List => {
        const insertionIndex = findOrCreateHierarchicalInsertionIndex(root, hierarchy);
        const nodeAfter = root.children[insertionIndex];
        
        if (nodeAfter && nodeAfter.type === 'list') {
            return nodeAfter;
        }

        const newList: List = { type: 'list', ordered: false, children: [] };
        root.children.splice(insertionIndex, 0, newList);
        return newList;
    };

    const archiveSection = useCallback((section: { startLine: number, endLine: number }, projectTitle: string) => {
        let sectionNodes: Content[] = [];
        let hierarchy: Task['headingHierarchy'] = [{ text: projectTitle, level: 1 }];

        performAstUpdate(tree => {
            let startIndex = -1, endIndex = -1;
            tree.children.forEach((node, i) => {
                if (node.position) {
                    if (node.position.start.line - 1 >= section.startLine && startIndex === -1) startIndex = i;
                    if (node.position.end.line - 1 <= section.endLine) endIndex = i;
                }
            });
            
            if (startIndex === -1) return;

            const currentProject = projects.find(p => p.title === projectTitle);
            const sectionHeadingNode = tree.children[startIndex];
            if (currentProject && sectionHeadingNode.type === 'heading') {
                const sectionHeadingText = toString(sectionHeadingNode).trim();
                // FIX: Add explicit type annotation for the argument in flatMap to ensure correct type inference.
                const taskWithHierarchy = [...currentProject.unassignedTasks, ...Object.values(currentProject.groupedTasks).flatMap((g: { user: User; tasks: Task[] }) => g.tasks)]
                    .find(t => t.sectionTitle === sectionHeadingText);
                if (taskWithHierarchy && taskWithHierarchy.headingHierarchy.length > 1) {
                     hierarchy = taskWithHierarchy.headingHierarchy;
                } else {
                    hierarchy = [{ text: projectTitle, level: 1 }, {text: sectionHeadingText, level: sectionHeadingNode.depth}]
                }
            }
            sectionNodes = tree.children.splice(startIndex, endIndex - startIndex + 1);
        });

        performAstUpdate(tree => {
            if (sectionNodes.length === 0) return;
            const insertionIndex = findOrCreateHierarchicalInsertionIndex(tree, hierarchy);
            const nodesToInsert = [...sectionNodes, { type: 'paragraph', children: [{ type: 'text', value: `_Archived on: ${new Date().toISOString().split('T')[0]}_` }] }];
            tree.children.splice(insertionIndex, 0, ...nodesToInsert);
        }, true);
    }, [performAstUpdate, projects]);

    const restoreSection = useCallback((section: { startLine: number, endLine: number }) => {
        let sectionNodes: Content[] = [];
        let hierarchy: Task['headingHierarchy'] = [];

        performAstUpdate(tree => {
            let startIndex = -1, endIndex = -1;
            tree.children.forEach((node, i) => {
                if (node.position) {
                    if (node.position.start.line - 1 >= section.startLine && startIndex === -1) startIndex = i;
                    if (node.position.end.line - 1 <= section.endLine) endIndex = i;
                }
            });

            if (startIndex === -1) return;

            const sectionHeadingNode = tree.children[startIndex];
            if (sectionHeadingNode.type === 'heading') {
                let currentLevel = sectionHeadingNode.depth;
                const path: Task['headingHierarchy'] = [{ text: toString(sectionHeadingNode).trim(), level: currentLevel }];
                
                for (let i = startIndex - 1; i >= 0; i--) {
                    const node = tree.children[i];
                    if (node.type === 'heading' && node.depth < currentLevel) {
                        path.unshift({ text: toString(node).trim(), level: node.depth });
                        currentLevel = node.depth;
                    }
                }
                hierarchy = path;
            }
            
            sectionNodes = tree.children.splice(startIndex, endIndex - startIndex + 1);
        }, true);
        
        performAstUpdate(tree => {
            if (sectionNodes.length === 0 || hierarchy.length === 0) return;

            const insertionIndex = findOrCreateHierarchicalInsertionIndex(tree, hierarchy);
            const nodeAtInsertionPoint = tree.children[insertionIndex];
            
            const contentNodesToRestore = sectionNodes
                .filter(node => node.type !== 'heading' && !(node.type === 'paragraph' && toString(node).startsWith('_Archived on:')))
                .flatMap(node => (node.type === 'list' ? (node as List).children : [node]));
                
            if (nodeAtInsertionPoint && nodeAtInsertionPoint.type === 'list') {
                nodeAtInsertionPoint.children.push(...contentNodesToRestore.filter(c => c.type === 'listItem') as ListItem[]);
            } else {
                const listItems = contentNodesToRestore.filter(c => c.type === 'listItem') as ListItem[];
                if (listItems.length > 0) {
                    const newList: List = { type: 'list', ordered: false, children: listItems };
                    tree.children.splice(insertionIndex, 0, newList);
                }
                 const nonListItems = contentNodesToRestore.filter(c => c.type !== 'listItem');
                 if (nonListItems.length > 0) {
                    tree.children.splice(insertionIndex, 0, ...nonListItems);
                }
            }
        });
    }, [performAstUpdate]);

    const archiveTasks = useCallback((tasksToArchive: Task[]) => {
        const lineIndicesToRemove = new Set(tasksToArchive.flatMap(t => Array.from({ length: t.blockEndLine - t.lineIndex + 1 }, (_, i) => t.lineIndex + i)));
        
        let extractedTaskNodesByHierarchy: Map<string, ListItem[]> = new Map();

        performAstUpdate(tree => {
            const parentsToClean = new Set<List>();
            visit(tree, 'listItem', (node: ListItem, index, parent: List) => {
                if (node.position && lineIndicesToRemove.has(node.position.start.line - 1)) {
                    const task = tasksToArchive.find(t => t.lineIndex === node.position!.start.line - 1);
                    if (task && parent && parent.type === 'list') {
                        const key = JSON.stringify(task.headingHierarchy);
                        if (!extractedTaskNodesByHierarchy.has(key)) extractedTaskNodesByHierarchy.set(key, []);
                        extractedTaskNodesByHierarchy.get(key)!.push(JSON.parse(JSON.stringify(node)));

                        parent.children.splice(index, 1);
                        parentsToClean.add(parent);
                        return [visit.SKIP, index];
                    }
                }
            });
            visit(tree, 'list', (node: List, index, parent) => {
                if (parentsToClean.has(node) && node.children.length === 0 && parent && Array.isArray((parent as any).children)) {
                     (parent as any).children.splice(index, 1);
                     return [visit.SKIP, index];
                }
            });
        });

        performAstUpdate(tree => {
             for(const [key, taskNodes] of extractedTaskNodesByHierarchy.entries()) {
                const hierarchy = JSON.parse(key);
                const targetList = findOrCreateHierarchicalList(tree, hierarchy);
                targetList.children.push(...taskNodes);
             }
        }, true);

    }, [performAstUpdate]);

    const reorderTask = useCallback((taskToMove: Task, direction: 'up' | 'down' | 'top' | 'bottom') => {
        performAstUpdate(tree => {
            let listNode: List | null = null;
            let currentItem: ListItem | null = null;
            let currentIndex = -1;

            visit(tree, 'listItem', (node: ListItem, index, parent: List) => {
                if (node.position?.start.line - 1 === taskToMove.lineIndex) {
                    listNode = parent;
                    currentItem = node;
                    currentIndex = index;
                    return EXIT;
                }
            });

            if (!listNode || !currentItem || currentIndex === -1) return;

            const siblings = listNode.children;
            let targetIndex: number;

            if (direction === 'top') targetIndex = 0;
            else if (direction === 'bottom') targetIndex = siblings.length - 1;
            else if (direction === 'up') targetIndex = currentIndex - 1;
            else targetIndex = currentIndex + 1;

            if (targetIndex < 0 || targetIndex >= siblings.length) return;

            siblings.splice(currentIndex, 1);
            siblings.splice(targetIndex, 0, currentItem);
        });
    }, [performAstUpdate]);
    
    const addBulkTaskUpdates = useCallback((taskLineIndexes: number[], updateText: string, assigneeAlias: string | null) => {
        performAstUpdate(tree => {
            const today = new Date().toISOString().split('T')[0];
            const assigneeString = assigneeAlias ? ` (@${assigneeAlias})` : '';
            const updateContent: PhrasingContent[] = [{ type: 'text', value: `${today}: ${updateText}${assigneeString}` }];
            const newUpdateItem: ListItem = { type: 'listItem', checked: null, children: [{ type: 'paragraph', children: updateContent }] };

            visit(tree, 'listItem', (node: ListItem) => {
                if (node.position && taskLineIndexes.includes(node.position.start.line - 1)) {
                    let subList = node.children.find(child => child.type === 'list') as List;
                    if (!subList) {
                        subList = { type: 'list', ordered: false, children: [] };
                        node.children.push(subList);
                    }
                    subList.children.push(JSON.parse(JSON.stringify(newUpdateItem)));
                }
            });
        });
    }, [performAstUpdate]);
    
    const updateUser = useCallback((oldAlias: string, updatedUser: User) => {
        setUsers(prevUsers => prevUsers.map(u => u.alias === oldAlias ? updatedUser : u));
        if (oldAlias !== updatedUser.alias) {
            const updater = (tree: Root) => {
                visit(tree, 'text', (node: Text) => {
                    node.value = node.value.replace(new RegExp(`\\(@${oldAlias}\\)`, 'g'), `(@${updatedUser.alias})`);
                });
            };
            performAstUpdate(updater, false);
            performAstUpdate(updater, true);
        }
    }, [performAstUpdate]);

    const deleteUser = useCallback((userAlias: string) => {
        setUsers(prevUsers => prevUsers.filter(u => u.alias !== userAlias));
        const updater = (tree: Root) => {
            visit(tree, 'text', (node: Text) => {
                node.value = node.value.replace(new RegExp(`\\s\\(@${userAlias}\\)`, 'g'), '');
            });
        };
        performAstUpdate(updater, false);
        performAstUpdate(updater, true);
    }, [performAstUpdate]);

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
                    setArchiveMarkdown(data.archiveMarkdown || initialArchiveMarkdown);
                    if (data.settings) saveSettings(data.settings as Settings);
                    alert('Project imported successfully!');
                } else {
                    alert('Invalid project file format.');
                }
            } catch (error) {
                alert('Failed to read or parse the project file.');
            }
        };
        reader.readAsText(file);
    }, [saveSettings]);

    const clearArchive = useCallback(() => {
        setArchiveMarkdown('');
    }, []);

    const handleRequestLocalRestore = useCallback(() => {}, []);

    const value: ProjectContextType = {
        markdown, setMarkdown, archiveMarkdown, users, setUsers, settings, saveSettings,
        projects, archiveProjects, updateSection, toggleTask, updateTaskBlock, moveSection,
        duplicateSection, addBulkTaskUpdates, addUser, updateUser, deleteUser,
        importProject, handleRequestLocalRestore, archiveSection, restoreSection,
        archiveTasks, reorderTask, clearArchive
    };

    return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = (): ProjectContextType => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
};