import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { User, TaskUpdate, Task, Heading, Project } from '../types';
import { Section } from '../hooks/useSectionParser';
import Toolbar from './Toolbar';
import { Pencil, Save, X, ChevronRight, ChevronDown, Archive, ArchiveRestore } from 'lucide-react';
import InputModal from './InputModal';
import DatePickerModal from './DatePickerModal';
import MoveSectionControl from './MoveSectionControl';
import DuplicateSectionControl from './DuplicateSectionControl';
import TableOfContents from './TableOfContents';
import ConfirmationModal from './ConfirmationModal';
import { useProject } from '../contexts/ProjectContext';
import InteractiveTaskItem from './InteractiveTaskItem';
import { InlineMarkdown } from '../lib/markdownUtils';

// Autocomplete Component for @ mentions
interface MentionAutocompleteProps {
  users: User[];
  position: { top: number; left: number };
  onSelect: (user: User) => void;
  activeIndex: number;
}

const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({ users, position, onSelect, activeIndex }) => {
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({
            block: 'nearest',
            inline: 'nearest'
        });
    }, [activeIndex]);

    return (
        <div
            ref={listRef}
            className="absolute bg-slate-900 border border-slate-700 rounded-md shadow-lg z-10 p-1 w-64 max-h-60 overflow-y-auto"
            style={{ top: position.top, left: position.left }}
            aria-live="polite"
        >
            {users.map((user, index) => (
                <button
                    key={user.alias}
                    data-index={index}
                    onClick={() => onSelect(user)}
                    className={`w-full text-left flex items-center space-x-2 px-2 py-1.5 rounded-md ${
                        activeIndex === index ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700 text-slate-200'
                    }`}
                    role="option"
                    aria-selected={activeIndex === index}
                >
                    <img src={user.avatarUrl} alt={user.name} className="h-6 w-6 rounded-full" />
                    <div>
                        <span className="text-sm font-medium">{user.name}</span>
                        <span className="text-xs text-slate-400 ml-2">@{user.alias}</span>
                    </div>
                </button>
            ))}
        </div>
    );
};

// The Main EditableSection Component
interface EditableSectionProps {
  section: Section;
  sectionIndex: number;
  allSections: Section[];
  users: User[];
  onSectionUpdate: (startLine: number, endLine: number, newContent: string) => void;
  onMoveSection: (sectionToMove: {startLine: number, endLine: number}, destinationLine: number) => void;
  onDuplicateSection: (sectionToDuplicate: {startLine: number, endLine: number}, destinationLine: number) => void;
  onToggle: (lineIndex: number, isCompleted: boolean) => void;
  onTogglePin: (lineIndex: number) => void;
  onUpdateTaskBlock: (absoluteStartLine: number, originalLineCount: number, newContent: string) => void;
  onArchiveSection: (startLine: number, endLine: number, projectTitle: string) => void;
  onRestoreSection: (startLine: number, endLine: number) => void;
  onArchiveTasks: (tasks: Task[]) => void;
  onReorderTask: (task: Task, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  tocHeadings?: Heading[];
  viewScope: 'single' | 'all';
  project?: Project;
  projectStartLine: number;
  isArchiveView?: boolean;
  hideCompletedTasks?: boolean;
  showPinnedOnly?: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const EditableSection: React.FC<EditableSectionProps> = (props) => {
  const { section, sectionIndex, allSections, onSectionUpdate, onMoveSection, onDuplicateSection, onArchiveSection, onRestoreSection, tocHeadings, viewScope, project, projectStartLine, isArchiveView, hideCompletedTasks, showPinnedOnly, isCollapsed, onToggleCollapse, onArchiveTasks, onReorderTask } = props;
  const { markdown } = useProject();
  const [isEditing, setIsEditing] = useState(() => !section.content.trim());
  const [editedContent, setEditedContent] = useState(section.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const userByAlias = useMemo(() => new Map(props.users.map(u => [u.alias, u])), [props.users]);
  
  // Modals state
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [inputModalConfig, setInputModalConfig] = useState<{
      onSubmit: (value: string) => void;
      title: string;
      label: string;
      confirmText: string;
  } | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState<{ top: number, left: number } | null>(null);
  const [filteredMentionUsers, setFilteredMentionUsers] = useState<User[]>([]);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);

  const completedTasksInSection = useMemo(() => {
    if (!project || isArchiveView) return [];
    
    const allProjectTasks = [
        ...project.unassignedTasks,
        // FIX: Cast Object.values to fix type inference issue with flatMap.
        ...(Object.values(project.groupedTasks) as Array<{ user: User, tasks: Task[] }>).flatMap(g => g.tasks)
    ];

    const sectionAbsoluteStart = projectStartLine + section.startLine;
    const sectionAbsoluteEnd = projectStartLine + section.endLine;

    return allProjectTasks.filter(task => 
        task.completed &&
        task.lineIndex >= sectionAbsoluteStart &&
        task.lineIndex <= sectionAbsoluteEnd
    );
  }, [project, section.startLine, section.endLine, isArchiveView, projectStartLine]);

  useEffect(() => {
    setEditedContent(section.content);
  }, [section.content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
        const end = textareaRef.current.value.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(end, end);
    }
  }, [isEditing]);
  
  useEffect(() => {
    if (isEditing && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing, editedContent]);
  
  useEffect(() => {
    if (mentionQuery === null) {
      setFilteredMentionUsers([]);
    }
  }, [mentionQuery]);

  const handleSave = () => {
    onSectionUpdate(section.startLine, section.endLine, editedContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(section.content);
    setIsEditing(false);
  };

  const handleMove = (destinationLine: number) => {
    onMoveSection({ startLine: section.startLine, endLine: section.endLine }, destinationLine);
  };
  
  const handleDuplicate = (destinationLine: number) => {
    onDuplicateSection({ startLine: section.startLine, endLine: section.endLine }, destinationLine);
  };
  
  const handleConfirmRestore = () => {
      onRestoreSection(section.startLine, section.endLine);
      setIsRestoreConfirmOpen(false);
  }

  const handleMentionSelect = useCallback((user: User) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = editedContent.substring(0, cursorPosition);
    
    const newText = textBeforeCursor.replace(/@(\w*)$/, `(@${user.alias}) `) + editedContent.substring(cursorPosition);
    
    setEditedContent(newText);
    setMentionQuery(null);

    setTimeout(() => {
        const newCursorPos = textBeforeCursor.lastIndexOf('@') + user.alias.length + 4;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [editedContent]);

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery === null || filteredMentionUsers.length === 0) return;

    if (['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'ArrowUp') {
            setActiveMentionIndex(prev => (prev > 0 ? prev - 1 : filteredMentionUsers.length - 1));
        } else if (e.key === 'ArrowDown') {
            setActiveMentionIndex(prev => (prev < filteredMentionUsers.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            const user = filteredMentionUsers[activeMentionIndex];
            if (user) handleMentionSelect(user);
        } else if (e.key === 'Escape') {
            setMentionQuery(null);
        }
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const textarea = e.target;
      const text = textarea.value;
      setEditedContent(text);

      const cursorPosition = textarea.selectionStart;
      const textBeforeCursor = text.substring(0, cursorPosition);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch && mirrorRef.current && textareaRef.current) {
          const query = mentionMatch[1].toLowerCase();
          
          const pre = text.substring(0, cursorPosition);
          mirrorRef.current.textContent = pre;
          const span = document.createElement('span');
          mirrorRef.current.appendChild(span);
          
          const { offsetLeft: left, offsetTop: top, offsetHeight: height } = span;
          
          setMentionPosition({ top: top + height - textarea.scrollTop, left: left - textarea.scrollLeft });
          setMentionQuery(query);
          
          const filtered = props.users.filter(user =>
              user.alias.toLowerCase().includes(query) ||
              user.name.toLowerCase().includes(query)
          );
          setFilteredMentionUsers(filtered);
          setActiveMentionIndex(0);
      } else {
          setMentionQuery(null);
      }
  };
  
    const handleInsertTextAtCursor = useCallback((text: string, type?: 'assignee') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const { selectionStart } = textarea;

        if (type === 'assignee') {
            const textBeforeCursor = editedContent.substring(0, selectionStart);
            const lineStart = textBeforeCursor.lastIndexOf('\n') + 1;
            
            let lineEnd = editedContent.indexOf('\n', selectionStart);
            if (lineEnd === -1) lineEnd = editedContent.length;

            let currentLine = editedContent.substring(lineStart, lineEnd);
            
            const globalAssigneeRegex = /\s\(@([a-zA-Z0-9_]+)\)/g;
            currentLine = currentLine.replace(globalAssigneeRegex, '');

            const newCurrentLine = currentLine.trimEnd() + ' ' + text;

            const newContent = editedContent.substring(0, lineStart) + newCurrentLine + editedContent.substring(lineEnd);
            setEditedContent(newContent);

            setTimeout(() => {
                textarea.focus();
                const newCursorPos = lineStart + newCurrentLine.length;
                textarea.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
            return;
        }

        const { selectionEnd } = textarea;
        const charBefore = selectionStart > 0 ? editedContent[selectionStart - 1] : '\n';
        const spaceBefore = /\s$/.test(charBefore) ? '' : ' ';
        const insertion = `${spaceBefore}${text}`;

        const newText = editedContent.substring(0, selectionStart) + insertion + editedContent.substring(selectionEnd);
        
        setEditedContent(newText);
        
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = selectionStart + insertion.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    }, [editedContent]);

  const handleDateSelect = useCallback((date: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const charBefore = selectionStart > 0 ? editedContent[selectionStart - 1] : '\n';
    const spaceBefore = /\s$/.test(charBefore) ? '' : ' ';
    const insertion = `${spaceBefore}!${date}`;

    const newText = editedContent.substring(0, selectionStart) + insertion + editedContent.substring(selectionEnd);
    setEditedContent(newText);
    
    setTimeout(() => {
        textarea.focus();
        const newCursorPos = selectionStart + insertion.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [editedContent]);

  const handleFormat = useCallback((type: 'bold' | 'italic' | 'link' | 'gmail' | 'h1' | 'h2' | 'h3' | 'ul' | 'task' | 'update' | 'dueDate') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const { selectionStart, selectionEnd } = textarea;
    const selectedText = editedContent.substring(selectionStart, selectionEnd);
    
    if (type === 'link') {
        setInputModalConfig({
            title: 'Insert Link',
            label: 'Enter the URL:',
            confirmText: 'Insert Link',
            onSubmit: (url) => {
                const charBefore = selectionStart > 0 ? editedContent[selectionStart - 1] : '\n';
                const charAfter = selectionEnd < editedContent.length ? editedContent[selectionEnd] : '\n';
                const spaceBefore = /^\s$/.test(charBefore) ? '' : ' ';
                const spaceAfter = /^\s$/.test(charAfter) ? '' : ' ';
                
                const linkText = selectedText || '🔗';
                const safeUrl = url.replace(/\(/g, '%28').replace(/\)/g, '%29');
                const insertion = spaceBefore + `[${linkText}](${safeUrl})` + spaceAfter;
                const newText = editedContent.substring(0, selectionStart) + insertion + editedContent.substring(selectionEnd);
                setEditedContent(newText);

                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.focus();
                        const selStart = selectionStart + spaceBefore.length + 1;
                        const selEnd = selStart + linkText.length;
                        textareaRef.current.setSelectionRange(selStart, selEnd);
                    }
                }, 0);
            }
        });
        setIsInputModalOpen(true);
        return;
    }

    if (type === 'gmail') {
        setInputModalConfig({
            title: 'Insert Gmail Link',
            label: 'Enter the email subject:',
            confirmText: 'Create Link',
            onSubmit: (subject) => {
                const charBefore = selectionStart > 0 ? editedContent[selectionStart - 1] : '\n';
                const charAfter = selectionEnd < editedContent.length ? editedContent[selectionEnd] : '\n';
                const spaceBefore = /^\s$/.test(charBefore) ? '' : ' ';
                const spaceAfter = /^\s$/.test(charAfter) ? '' : ' ';

                const encodedQuery = encodeURIComponent(`subject:"${subject}"`);
                const searchUrl = `https://mail.google.com/mail/u/0/#search/${encodedQuery}`;
                const safeSearchUrl = searchUrl.replace(/\(/g, '%28').replace(/\)/g, '%29');
                const insertion = spaceBefore + `[📨 ${subject}](${safeSearchUrl})` + spaceAfter;
                const newText = editedContent.substring(0, selectionStart) + insertion + editedContent.substring(selectionEnd);
                setEditedContent(newText);

                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.focus();
                        const newCursorPos = selectionStart + insertion.length;
                        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                    }
                }, 0);
            }
        });
        setIsInputModalOpen(true);
        return;
    }

    if (type === 'dueDate') {
        setIsDatePickerOpen(true);
        return;
    }

    let prefix = '';
    let suffix = '';
    let insertion = '';
    let newCursorPos = -1;
    let newText;
    
    switch (type) {
        case 'h1': prefix = '# '; break;
        case 'h2': prefix = '## '; break;
        case 'h3': prefix = '### '; break;
        case 'bold': prefix = '**'; suffix = '**'; break;
        case 'italic': prefix = '*'; suffix = '*'; break;
        case 'ul': prefix = '- '; break;
        case 'task': {
            const today = new Date().toISOString().split('T')[0];
            if (selectionStart !== selectionEnd) { // Multi-line selection
                const newLines = selectedText.split('\n').map(line => {
                    if (line.trim() === '') return line;
                    if (line.trim().match(/^[-*] \[( |x)\]/)) return line;
                    return `- [ ] ${line.trim()} +${today}`;
                }).join('\n');
                
                newText = editedContent.substring(0, selectionStart) + newLines + editedContent.substring(selectionEnd);
                setEditedContent(newText);
                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.focus();
                        textareaRef.current.setSelectionRange(selectionStart + newLines.length, selectionStart + newLines.length);
                    }
                }, 0);
                return;
            } else { // Single-line insertion
                const textBeforeCursor = editedContent.substring(0, selectionStart);
                const atEndOfNonEmptyLine = selectionStart > 0 && editedContent[selectionStart - 1] !== '\n';
                prefix = (atEndOfNonEmptyLine ? '\n' : '') + '- [ ] ';
                suffix = ` +${today}`;
            }
            break;
        }
        case 'update': {
            const today = new Date().toISOString().split('T')[0];
            const textBeforeCursor = editedContent.substring(0, selectionStart);
            const needsNewline = selectionStart > 0 && !textBeforeCursor.endsWith('\n');
            insertion = `${needsNewline ? '\n' : ''}  - ${today}: `;
            newCursorPos = selectionStart + insertion.length;
            break;
        }
    }

    if (insertion) {
        newText = editedContent.substring(0, selectionStart) + insertion + editedContent.substring(selectionEnd);
    } else {
        newText = editedContent.substring(0, selectionStart) + prefix + selectedText + suffix + editedContent.substring(selectionEnd);
    }

    setEditedContent(newText);
    
    setTimeout(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            if (newCursorPos !== -1) {
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            } else if (selectedText.length === 0) {
                 const cursorPos = selectionStart + prefix.length;
                textareaRef.current.setSelectionRange(cursorPos, cursorPos);
            } else {
                 textareaRef.current.setSelectionRange(selectionStart + prefix.length, selectionEnd + prefix.length);
            }
        }
    }, 0);

  }, [editedContent]);

  const renderPreviewContent = useCallback((tocHeadingsForSlugs?: Heading[]) => {
    const lines = section.content.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;
  
    const findFullTaskBlock = (startIndex: number): { task: Task | null; endIndex: number } => {
        const line = lines[startIndex];
        const taskMatch = line.match(/^- \[( |x)\](.*)/);
        if (!taskMatch) return { task: null, endIndex: startIndex };

        let fullTaskText = taskMatch[2].trim();
        let assignee: User | null = null;
        let completionDate: string | null = null;
        let creationDate: string | null = null;
        let cost: number | undefined = undefined;
        let dueDate: string | null = null;
        let headingHierarchy: { text: string; level: number }[] = [];
        let pinned = false;

        const projectForTask = project;
        if (projectForTask) {
            const absoluteLineIndex = projectStartLine + section.startLine + startIndex;
            // FIX: Cast Object.values to fix type inference issue with flatMap.
            const taskFromContext = [...projectForTask.unassignedTasks, ...(Object.values(projectForTask.groupedTasks) as Array<{ user: User, tasks: Task[] }>).flatMap(g => g.tasks)].find(t => t.lineIndex === absoluteLineIndex);
            if (taskFromContext) {
                 assignee = taskFromContext.assigneeAlias ? userByAlias.get(taskFromContext.assigneeAlias) ?? null : null;
                 completionDate = taskFromContext.completionDate;
                 creationDate = taskFromContext.creationDate ?? null;
                 cost = taskFromContext.cost;
                 dueDate = taskFromContext.dueDate ?? null;
                 headingHierarchy = taskFromContext.headingHierarchy;
                 fullTaskText = taskFromContext.text;
                 pinned = taskFromContext.pinned;
            }
        }
        
        const updates: TaskUpdate[] = [];
        let j = startIndex + 1;
        while (j < lines.length) {
            const updateLine = lines[j];
            const updateMatch = updateLine.match(/^  - (\d{4}-\d{2}-\d{2}): (.*)/);
            if (updateMatch) {
                let updateText = updateMatch[2].trim();
                let updateAssigneeAlias: string | null = null;
                const updateAssigneeMatch = updateText.match(/\s\(@([a-zA-Z0-9_]+)\)/);
                if (updateAssigneeMatch) {
                    updateAssigneeAlias = updateAssigneeMatch[1];
                    updateText = updateText.replace(updateAssigneeMatch[0], '').trim();
                }
                updates.push({
                    lineIndex: section.startLine + j,
                    date: updateMatch[1],
                    text: updateText,
                    assigneeAlias: updateAssigneeAlias,
                });
                j++;
            } else if (updateLine.trim() === '') {
                 j++;
            } else {
                break;
            }
        }
        
        const absoluteLineIndex = projectStartLine + section.startLine + startIndex;
        const task: Task = {
            lineIndex: absoluteLineIndex,
            text: fullTaskText,
            completed: taskMatch[1] === 'x',
            pinned,
            assigneeAlias: assignee?.alias ?? null,
            creationDate,
            completionDate,
            dueDate,
            updates,
            projectTitle: project?.title ?? '',
            cost,
            blockEndLine: absoluteLineIndex + (j - 1 - startIndex),
            headingHierarchy,
        };
        return { task, endIndex: j };
    };
  
    while (i < lines.length) {
        const line = lines[i];
        const relativeLineIndex = section.startLine + i;
        const absoluteLineIndex = (project?.startLine ?? 0) + relativeLineIndex;
  
        const isTaskLine = line.match(/^- \[( |x)\] .*/);
        if (isTaskLine) {
            const taskList: Task[] = [];
            let currentParseIndex = i;
            while (currentParseIndex < lines.length) {
                const { task, endIndex } = findFullTaskBlock(currentParseIndex);
                if (task) {
                    taskList.push(task);
                    currentParseIndex = endIndex;
                } else {
                    break;
                }
            }
            
            const filteredTasks = taskList.filter(task => {
                if (hideCompletedTasks && task.completed && !isArchiveView) return false;
                if (showPinnedOnly && !task.pinned) return false;
                return true;
            });

            filteredTasks.forEach((task, taskIndex) => {
                const blockLineCount = task.blockEndLine - task.lineIndex + 1;
                const taskBlockContent = markdown.split('\n').slice(task.lineIndex, task.lineIndex + blockLineCount).join('\n');

                elements.push(
                    <InteractiveTaskItem 
                        key={task.lineIndex} 
                        task={task}
                        taskBlockContent={taskBlockContent}
                        onToggle={props.onToggle}
                        onTogglePin={props.onTogglePin}
                        onUpdateTaskBlock={props.onUpdateTaskBlock}
                        users={props.users} 
                        isArchiveView={isArchiveView}
                        onArchiveTask={(taskToArchive) => onArchiveTasks([taskToArchive])}
                        onReorderTask={onReorderTask}
                        taskIndexInList={taskIndex}
                        totalTasksInList={filteredTasks.length}
                    />
                );
            });

            i = currentParseIndex;
            continue;
        }

        const archiveDateMatch = line.match(/^_Archived on: (.*)_/);
        if (isArchiveView && archiveDateMatch) {
            elements.push(<blockquote key={`archive-date-${i}`} className="border-l-4 border-slate-600 pl-4 py-2 my-4 text-slate-400 italic">Archived on: {archiveDateMatch[1]}</blockquote>);
            i++; continue;
        }
  
        const hMatch = line.match(/^(#+) (.*)/);
        if (hMatch && i === 0 && section.heading) {
            const level = hMatch[1].length;
            const text = hMatch[2].trim();
            const headingData = tocHeadingsForSlugs?.find(h => h.line === (viewScope === 'single' && !isArchiveView ? relativeLineIndex + project.startLine : relativeLineIndex));
            
            let slugForId: string | undefined;
            if (level === 1) {
                slugForId = project?.slug;
            } else {
                slugForId = headingData?.slug;
            }
            
            let headingClassName: string;
            let buttonClassName = "font-bold flex items-center w-full text-left transition-colors hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded p-1 -ml-1";
            
            switch(level) {
                case 1: headingClassName = "text-3xl mt-6 mb-3 pb-2 border-b border-slate-700 scroll-mt-20"; break;
                case 2: headingClassName = "text-2xl mt-5 mb-2 scroll-mt-20"; break;
                case 3: default: headingClassName = "text-xl mt-4 mb-1 scroll-mt-20"; break;
            }
  
            const HeadingTag = `h${level}`;
            elements.push(React.createElement(HeadingTag, { key: i, id: slugForId, className: headingClassName },
                <button className={buttonClassName} onClick={onToggleCollapse} aria-expanded={!isCollapsed} aria-controls={`section-content-${section.startLine}`}>
                    {isCollapsed ? <ChevronRight className="w-5 h-5 mr-2 flex-shrink-0 text-slate-400" /> : <ChevronDown className="w-5 h-5 mr-2 flex-shrink-0 text-slate-400" />}
                    <span className="flex-grow"><InlineMarkdown text={text} /></span>
                </button>
            ));
            i++; continue;
        } else if (hMatch) {
            const level = hMatch[1].length;
            const text = hMatch[2].trim();
            const headingData = tocHeadingsForSlugs?.find(h => h.line === absoluteLineIndex);
            let className = "font-bold scroll-mt-20 ";
            if (level === 1) className += "text-3xl mt-6 mb-3 pb-2 border-b border-slate-700";
            else if (level === 2) className += "text-2xl mt-5 mb-2";
            else if (level === 3) className += "text-xl mt-4 mb-1";
            elements.push(React.createElement(`h${level}`, { key: i, className, id: headingData?.slug }, <InlineMarkdown text={text} />));
            i++; continue;
        }
        
        const ulMatch = line.match(/^[-*] (.*)/);
        if (ulMatch) elements.push(<li key={i} className="ml-6 list-disc text-slate-300"><InlineMarkdown text={ulMatch[1]} /></li>);
        else if (line.trim() === '') elements.push(<div key={i} className="h-4"></div>);
        else elements.push(<p key={i} className="text-slate-300 my-2 leading-relaxed"><InlineMarkdown text={line} /></p>);
        i++;
    }
    return elements;
  }, [section.content, section.startLine, section.heading, props.users, props.onToggle, props.onTogglePin, props.onUpdateTaskBlock, userByAlias, onToggleCollapse, isCollapsed, project, viewScope, isArchiveView, hideCompletedTasks, showPinnedOnly, markdown, projectStartLine, onArchiveTasks, onReorderTask]);

  const renderedNodes = useMemo(() => {
    if (isEditing) return null;
    return renderPreviewContent(tocHeadings);
  }, [isEditing, renderPreviewContent, tocHeadings]);
  
  if (isEditing) {
    return (
        <>
        <div className="relative group bg-slate-800/50 rounded-lg p-4 my-4 transition-colors duration-200 border-2 border-indigo-600 shadow-lg">
             <div className="mb-4">
                <Toolbar onFormat={handleFormat} onInsert={handleInsertTextAtCursor} users={props.users} />
            </div>
            <div className="relative">
                <div ref={mirrorRef} className="invisible absolute top-0 left-0 p-3 w-full font-mono text-sm leading-relaxed whitespace-pre-wrap break-words"></div>
                <textarea
                    ref={textareaRef}
                    value={editedContent}
                    onChange={handleTextareaChange}
                    onKeyDown={handleTextareaKeyDown}
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-md resize-y focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm leading-relaxed"
                />
                 {mentionQuery !== null && filteredMentionUsers.length > 0 && mentionPosition && (
                    <MentionAutocomplete
                        users={filteredMentionUsers}
                        position={mentionPosition}
                        onSelect={handleMentionSelect}
                        activeIndex={activeMentionIndex}
                    />
                )}
            </div>
            <div className="flex justify-end items-center mt-4 space-x-3">
                <button onClick={handleCancel} className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-500 font-semibold flex items-center space-x-2"><X className="w-4 h-4"/><span>Cancel</span></button>
                <button onClick={handleSave} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 font-semibold flex items-center space-x-2"><Save className="w-4 h-4"/><span>Save</span></button>
            </div>
        </div>
        {isInputModalOpen && inputModalConfig && (
            <InputModal
                isOpen={isInputModalOpen}
                onClose={() => setIsInputModalOpen(false)}
                onSubmit={inputModalConfig.onSubmit}
                title={inputModalConfig.title}
                label={inputModalConfig.label}
                confirmText={inputModalConfig.confirmText}
            />
        )}
         <DatePickerModal
            isOpen={isDatePickerOpen}
            onClose={() => setIsDatePickerOpen(false)}
            onSelectDate={handleDateSelect}
            title="Select Due Date"
            confirmText="Insert Date"
        />
        </>
    );
  }

  if (!renderedNodes) {
    return null;
  }
        
  const headingNode = section.heading ? renderedNodes.find(n => React.isValidElement(n) && typeof n.type === 'string' && n.type.startsWith('h')) : null;
  const contentNodes = renderedNodes.filter(n => n !== headingNode);

  return (
    <>
    <div className="relative group bg-slate-800/30 hover:bg-slate-800/50 rounded-lg transition-colors duration-200">
       <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        {!isArchiveView && completedTasksInSection.length > 0 && (
            <button 
                onClick={() => onArchiveTasks(completedTasksInSection)}
                className="p-2 rounded-full bg-slate-700/50 text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 hover:bg-indigo-600 hover:text-white"
                aria-label="Archive completed tasks in this section"
                title="Archive completed tasks"
            >
                <Archive className="w-4 h-4" />
            </button>
        )}
        {isArchiveView && (
            <button 
                onClick={() => setIsRestoreConfirmOpen(true)}
                className="p-2 rounded-full bg-slate-700/50 text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 hover:bg-indigo-600 hover:text-white"
                aria-label="Restore section"
                title="Restore section"
            >
                <ArchiveRestore className="w-4 h-4" />
            </button>
        )}
        {!isArchiveView && (
          <>
            <DuplicateSectionControl
                allSections={allSections}
                currentSectionIndex={sectionIndex}
                onDuplicateSection={handleDuplicate}
                viewScope={viewScope}
            />
            <MoveSectionControl
              allSections={allSections}
              currentSectionIndex={sectionIndex}
              onMoveSection={handleMove}
              viewScope={viewScope}
            />
          </>
        )}
       <button 
        onClick={() => setIsEditing(true)} 
        className="p-2 rounded-full bg-slate-700/50 text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 hover:bg-indigo-600 hover:text-white"
        aria-label="Edit section"
      >
        <Pencil className="w-4 h-4" />
      </button>
      </div>
      <div className="p-4 prose-invert pb-8">
        {headingNode}
        <div id={`section-content-${section.startLine}`} role="region">
          {(!isCollapsed || !section.heading) && contentNodes}
        </div>
      </div>
    </div>
     <ConfirmationModal
          isOpen={isRestoreConfirmOpen}
          onClose={() => setIsRestoreConfirmOpen(false)}
          onConfirm={handleConfirmRestore}
          title="Restore Section"
          confirmText="Yes, Restore"
      >
          <p>Are you sure you want to restore this section?</p>
          <p className="text-sm text-slate-400 mt-2">The section will be removed from the archive and merged back into the active project.</p>
      </ConfirmationModal>
    </>
  );
};

export default EditableSection;