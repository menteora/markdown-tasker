import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { User, TaskUpdate, Task, Heading, Project } from '../types';
import Toolbar from './Toolbar';
import { Pencil, Save, X, CheckCircle2, CalendarDays, ChevronRight, Archive, ChevronsUp, ChevronUp, ChevronDown, ChevronsDown } from 'lucide-react';
import InputModal from './InputModal';
import DatePickerModal from './DatePickerModal';
import TaskReorderControls from './TaskReorderControls';
import { InlineMarkdown } from '../lib/markdownUtils';

// InteractiveTaskItem Component
interface InteractiveTaskItemProps {
    task: Task;
    taskBlockContent: string;
    onToggle: (absoluteLineIndex: number, isCompleted: boolean) => void;
    onUpdateTaskBlock: (absoluteStartLine: number, originalLineCount: number, newContent: string) => void;
    users: User[];
    isArchiveView?: boolean;
    onArchiveTask: (task: Task) => void;
    onReorderTask: (task: Task, direction: 'up' | 'down' | 'top' | 'bottom') => void;
    taskIndexInList: number;
    totalTasksInList: number;
}

const InteractiveTaskItem: React.FC<InteractiveTaskItemProps> = ({ task, taskBlockContent, onToggle, onUpdateTaskBlock, users, isArchiveView, onArchiveTask, onReorderTask, taskIndexInList, totalTasksInList }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(taskBlockContent);
  const [areUpdatesVisible, setAreUpdatesVisible] = useState(false);
  const userByAlias = useMemo(() => new Map(users.map(u => [u.alias, u])), [users]);
  const assignee = task.assigneeAlias ? userByAlias.get(task.assigneeAlias) : null;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [inputModalConfig, setInputModalConfig] = useState<{
      onSubmit: (value: string) => void;
      title: string;
      label: string;
      confirmText: string;
  } | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setEditedContent(taskBlockContent);
    }
  }, [taskBlockContent, isEditing]);

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

  const handleSave = () => {
    const originalLineCount = task.blockEndLine - task.lineIndex + 1;
    onUpdateTaskBlock(task.lineIndex, originalLineCount, editedContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(taskBlockContent);
    setIsEditing(false);
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


  const getDueDateInfo = (dateString: string | null, isCompleted: boolean): { pillColor: string; label: string } | null => {
      if (!dateString || isCompleted) return null;
      const today = new Date(); today.setHours(0, 0, 0, 0); const due = new Date(`${dateString}T00:00:00`);
      const diffTime = due.getTime() - today.getTime(); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return { pillColor: 'bg-red-500/20 text-red-400', label: `Overdue` };
      if (diffDays === 0) return { pillColor: 'bg-yellow-500/20 text-yellow-400', label: 'Due today' };
      return { pillColor: 'bg-slate-700/50 text-slate-300', label: `Due in ${diffDays} day(s)` };
  };
  const dueDateInfo = getDueDateInfo(task.dueDate, task.completed);
  
  if (isEditing) {
    return (
      <>
        <div className="py-2 border-b border-indigo-500/30 bg-slate-800/30 rounded-lg p-3 my-2">
          <div className="mb-2">
            <Toolbar onFormat={handleFormat} onInsert={handleInsertTextAtCursor} users={users} />
          </div>
          <textarea
            ref={textareaRef}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full p-2 bg-slate-900 border border-slate-700 rounded-md resize-y focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm leading-relaxed"
            autoFocus
          />
          <div className="flex justify-end items-center mt-2 space-x-2">
            <button onClick={handleCancel} className="px-3 py-1 rounded-md bg-slate-600 hover:bg-slate-500 font-semibold text-sm flex items-center space-x-2"><X className="w-4 h-4"/><span>Cancel</span></button>
            <button onClick={handleSave} className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 font-semibold text-sm flex items-center space-x-2"><Save className="w-4 h-4"/><span>Save</span></button>
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

  return (
    <div className="py-2 border-b border-slate-800">
        <div className="flex items-start space-x-3 group">
            <input type="checkbox" checked={task.completed} onChange={(e) => onToggle(task.lineIndex, e.target.checked)} className="h-5 w-5 rounded-md bg-slate-700 border-slate-600 text-indigo-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 cursor-pointer flex-shrink-0 mt-1" disabled={isArchiveView}/>
            <div className="flex-grow min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className={`leading-snug ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      <InlineMarkdown text={task.text} />
                    </span>
                    {assignee && (
                      <div className="inline-flex items-center space-x-1.5 bg-slate-700/60 text-slate-300 px-1.5 py-0.5 rounded-full text-xs whitespace-nowrap" title={`Assigned to ${assignee.name}`}>
                        <img src={assignee.avatarUrl} alt={assignee.name} className="h-4 w-4 rounded-full" />
                        <span>{assignee.name}</span>
                      </div>
                    )}
                    {dueDateInfo && (
                      <div className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-xs whitespace-nowrap ${dueDateInfo.pillColor}`} title={dueDateInfo.label}>
                        <CalendarDays className="w-3 h-3" />
                        <span>{task.dueDate}</span>
                      </div>
                    )}
                     {task.cost !== undefined && (
                      <span className="inline-flex items-center font-semibold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full text-xs whitespace-nowrap">
                        ${task.cost.toFixed(2)}
                      </span>
                    )}
                    {task.completionDate && task.completed && (
                      <div className="inline-flex items-center space-x-1 bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded-full text-xs whitespace-nowrap" title={`Completed on ${task.completionDate}`}>
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span>{task.completionDate}</span>
                      </div>
                    )}
                </div>
            </div>
            <div className="flex items-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {!isArchiveView && (
                    <TaskReorderControls
                        onReorder={(direction) => onReorderTask(task, direction)}
                        canMoveUp={taskIndexInList > 0}
                        canMoveDown={taskIndexInList < totalTasksInList - 1}
                    />
                )}
                {!isArchiveView && task.completed && (
                    <button 
                        onClick={() => onArchiveTask(task)} 
                        className="p-2 rounded-full hover:bg-slate-700 text-slate-400" 
                        title="Archive task"
                    >
                        <Archive className="w-4 h-4" />
                    </button>
                )}
                {!isArchiveView && (
                    <button 
                        onClick={() => setIsEditing(true)} 
                        className="p-2 rounded-full hover:bg-slate-700 text-slate-400" 
                        title="Edit task and updates"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
        {task.updates.length > 0 && (
            <>
                <div className="pl-8 mt-2">
                    <button
                        onClick={() => setAreUpdatesVisible(v => !v)}
                        className="flex items-center text-xs text-slate-400 hover:text-indigo-300 transition-colors py-1 rounded"
                        aria-expanded={areUpdatesVisible}
                        aria-controls={`updates-${task.lineIndex}`}
                    >
                        <ChevronRight className={`w-4 h-4 mr-1 transition-transform ${areUpdatesVisible ? 'rotate-90' : ''}`} />
                        <span className="font-medium">{task.updates.length} update{task.updates.length > 1 ? 's' : ''}</span>
                    </button>
                </div>
                {areUpdatesVisible && (
                    <div id={`updates-${task.lineIndex}`} className="pl-8 mt-2 space-y-2 border-l-2 border-slate-800 ml-2.5">
                        {task.updates.map(update => {
                            const updateAssignee = update.assigneeAlias ? userByAlias.get(update.assigneeAlias) : null;
                            return (
                                <div key={update.lineIndex} className="flex items-center space-x-2 text-sm text-slate-400 w-full group">
                                    {updateAssignee ? <img src={updateAssignee.avatarUrl} title={updateAssignee.name} className="w-5 h-5 rounded-full flex-shrink-0" alt={updateAssignee.name} /> : <div className="w-5 h-5 flex-shrink-0" />}
                                    <span className="font-mono text-slate-500 whitespace-nowrap">{update.date}:</span>
                                    <p className="flex-grow min-w-0"><InlineMarkdown text={update.text} /></p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </>
        )}
    </div>
  );
};

export default InteractiveTaskItem;