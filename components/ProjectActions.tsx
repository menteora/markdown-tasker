

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { BookUp, Upload, Download, FileText, CalendarDays } from 'lucide-react';
import * as docx from 'docx';
import saveAs from 'file-saver';
import type { Task, User, Project, Settings } from '../types';
import DailyReportModal from './DailyReportModal';
import { useProject } from '../contexts/ProjectContext';

type ViewScope = 'single' | 'all';

interface ProjectActionsProps {
    viewScope: ViewScope;
    currentProject: Project;
    isArchiveView?: boolean;
}

const ProjectActions: React.FC<ProjectActionsProps> = ({ viewScope, currentProject, isArchiveView }) => {
    const { markdown, archiveMarkdown, projects, users, settings, importProject } = useProject();
    const [isOpen, setIsOpen] = useState(false);
    const [isDailyReportModalOpen, setIsDailyReportModalOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const userByAlias = useMemo(() => new Map(users.map(u => [u.alias, u])), [users]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleExportProject = useCallback(() => {
        const projectData = { users, markdown, archiveMarkdown, settings };
        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const filename = projects.length > 1 ? 'Multi-Project.mdtasker' : `${currentProject.title.replace(/\s/g, '_')}.mdtasker`;
        saveAs(blob, filename);
        setIsOpen(false);
    }, [users, markdown, archiveMarkdown, settings, projects, currentProject.title]);
    
    const createInlinesFromMarkdown = (text: string, options: any = {}): (docx.TextRun | docx.ExternalHyperlink)[] => {
        const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g);
        return parts.filter(Boolean).map((part) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return new docx.TextRun({ text: part.slice(2, -2), bold: true, ...options });
            }
            if (part.startsWith('*') && part.endsWith('*')) {
                return new docx.TextRun({ text: part.slice(1, -1), italics: true, ...options });
            }
            const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
            if (linkMatch) {
                return new docx.ExternalHyperlink({
                    children: [
                        new docx.TextRun({
                            text: linkMatch[1],
                            style: "Hyperlink",
                            ...options
                        }),
                    ],
                    link: linkMatch[2],
                });
            }
            return new docx.TextRun({ text: part, ...options });
        });
    };

    const formatDate = (dateString: string | null): string => {
        if (!dateString) return '';
        try {
            const date = new Date(`${dateString}T00:00:00`);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch (e) {
            return dateString;
        }
    };
    
    const renderTasksForDocx = (tasks: Task[], children: docx.Paragraph[]) => {
        tasks.forEach(task => {
           const taskRuns = createInlinesFromMarkdown(task.text, task.completed ? { strike: true } : {});
           const taskTextChildren: (docx.TextRun | docx.ExternalHyperlink)[] = [new docx.TextRun(task.completed ? '☑ ' : '☐ '), ...taskRuns];
           if (task.cost !== undefined) {
               taskTextChildren.push(new docx.TextRun({ text: ` ($${task.cost.toFixed(2)})`, color: '2E8B57', size: 18, italics: true }));
           }
            if (task.creationDate) {
                taskTextChildren.push(new docx.TextRun({ text: ` (Created: ${formatDate(task.creationDate)})`, color: '808080', size: 18, italics: true }));
            }
            if (task.dueDate && !task.completed) {
                taskTextChildren.push(new docx.TextRun({ text: ` (Due: ${formatDate(task.dueDate)})`, color: 'A52A2A', size: 18, italics: true }));
            }
           if (task.completed && task.completionDate) {
               taskTextChildren.push(new docx.TextRun({ text: ` (Completed: ${formatDate(task.completionDate)})`, color: '808080', size: 18, italics: true }));
           }
           children.push(new docx.Paragraph({ children: taskTextChildren, bullet: { level: 0 } }));

           task.updates.forEach(update => {
               const updateAssignee = update.assigneeAlias ? userByAlias.get(update.assigneeAlias) : null;
               const updateTextRuns = createInlinesFromMarkdown(update.text);
               const updateChildren = [new docx.TextRun({ text: `${formatDate(update.date)}: `, italics: true, color: '808080'}), ...updateTextRuns];
               if (updateAssignee) {
                   updateChildren.push(new docx.TextRun({ text: ` - ${updateAssignee.name}`, italics: true, color: '808080' }));
               }
               children.push(new docx.Paragraph({ children: updateChildren, bullet: { level: 1 } }));
           });
       });
   };

    const renderTasksAndFilteredUpdatesForDocx = (tasks: Task[], children: docx.Paragraph[]) => {
        tasks.forEach(task => {
            const taskRuns = createInlinesFromMarkdown(task.text, task.completed ? { strike: true } : {});
            const taskTextChildren: (docx.TextRun | docx.ExternalHyperlink)[] = [new docx.TextRun(task.completed ? '☑ ' : '☐ '), ...taskRuns];
            
            children.push(new docx.Paragraph({ children: taskTextChildren, bullet: { level: 0 } }));

            task.updates.forEach(update => {
                const updateAssignee = update.assigneeAlias ? userByAlias.get(update.assigneeAlias) : null;
                const updateTextRuns = createInlinesFromMarkdown(update.text);
                const updateChildren = [new docx.TextRun({ text: `${formatDate(update.date)}: `, italics: true, color: '808080'}), ...updateTextRuns];
                if (updateAssignee) {
                    updateChildren.push(new docx.TextRun({ text: ` - ${updateAssignee.name}`, italics: true, color: '808080' }));
                }
                children.push(new docx.Paragraph({ children: updateChildren, bullet: { level: 1 } }));
            });
        });
    };

    const handleDailyReportExport = useCallback(async (selectedDate: string) => {
        const docTitle = `Daily_Report_${selectedDate}`;
        const reportChildren: docx.Paragraph[] = [];

        reportChildren.push(new docx.Paragraph({
            text: `Daily Update Report for ${formatDate(selectedDate)}`,
            heading: docx.HeadingLevel.TITLE,
            alignment: docx.AlignmentType.CENTER
        }));
    
        const projectsToExport = viewScope === 'all' ? projects : [currentProject];
        let updatesFound = false;

        projectsToExport.forEach((project, index) => {
            const allTasksInProject = [
                ...project.unassignedTasks,
                // FIX: Add explicit type to lambda parameter to fix 'tasks' property does not exist on type 'unknown' error.
                ...Object.values(project.groupedTasks).flatMap((g: { user: User; tasks: Task[] }) => g.tasks)
            ];

            const tasksWithUpdatesOnDate = allTasksInProject.map(task => {
                const relevantUpdates = task.updates.filter(update => update.date === selectedDate);
                return { ...task, updates: relevantUpdates };
            }).filter(task => task.updates.length > 0);
            
            if (tasksWithUpdatesOnDate.length === 0) return;

            updatesFound = true;
            if (projectsToExport.length > 1) {
                 reportChildren.push(new docx.Paragraph({ 
                    text: project.title, 
                    heading: docx.HeadingLevel.HEADING_1,
                    spacing: { before: index > 0 ? 400 : 200, after: 200 }
                }));
            }
    
            const groupedByAssignee: { [key: string]: Task[] } = {};
            tasksWithUpdatesOnDate.forEach(task => {
                const key = task.assigneeAlias || 'unassigned';
                if (!groupedByAssignee[key]) groupedByAssignee[key] = [];
                groupedByAssignee[key].push(task);
            });
    
            const assigneeOrder = [...users.map(u => u.alias), 'unassigned'];
    
            assigneeOrder.forEach(alias => {
                if (groupedByAssignee[alias]) {
                    const userName = alias === 'unassigned' ? 'Unassigned' : userByAlias.get(alias)?.name || alias;
                    reportChildren.push(new docx.Paragraph({
                        text: userName,
                        heading: docx.HeadingLevel.HEADING_2,
                        spacing: { before: 300, after: 150 }
                    }));
                    renderTasksAndFilteredUpdatesForDocx(groupedByAssignee[alias], reportChildren);
                }
            });
        });
        
        if (!updatesFound) {
            reportChildren.push(new docx.Paragraph({
                children: [
                    new docx.TextRun({
                        text: "No updates found for the selected date.",
                        italics: true,
                    }),
                ],
                alignment: docx.AlignmentType.CENTER,
                spacing: { before: 200 },
            }));
        }
        
        const doc = new docx.Document({ sections: [{ children: reportChildren }] });
        const blob = await docx.Packer.toBlob(doc);
        saveAs(blob, `${docTitle}.docx`);

        setIsDailyReportModalOpen(false);
        setIsOpen(false);
    }, [projects, currentProject, viewScope, users, userByAlias]);


    const handleDocxExport = useCallback(async () => {
        const docTitle = viewScope === 'all' ? 'All_Projects_Summary' : currentProject.title.replace(/\s/g, '_');
        
        const markdownToExport = viewScope === 'single' && currentProject
            ? markdown.split('\n').slice(currentProject.startLine, currentProject.endLine + 1).join('\n')
            : markdown;

        const projectPageChildren: docx.Paragraph[] = [];
        const lines = markdownToExport.split('\n');
        
        const taskRegex = /^- \[( |x)\] (.*)/;
        const assigneeRegex = /\s\(@([a-zA-Z0-9_]+)\)/;
        const dateRegex = /\s~([0-9]{4}-[0-9]{2}-[0-9]{2})/;
        const costRegex = /\s\(\$(\d+(\.\d{1,2})?)\)/;
        const creationDateRegex = /\s\+([0-9]{4}-[0-9]{2}-[0-9]{2})/;
        const dueDateRegex = /\s!([0-9]{4}-[0-9]{2}-[0-9]{2})/;
        const updateRegex = /^  - (\d{4}-\d{2}-\d{2}): (.*)/;

        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            const taskMatch = line.match(taskRegex);
            if (taskMatch) {
                let fullTaskText = taskMatch[2];
                const completed = taskMatch[1] === 'x';
                
                let completionDate: string | null = null;
                const dateMatch = fullTaskText.match(dateRegex);
                if (dateMatch) {
                    completionDate = dateMatch[1];
                    fullTaskText = fullTaskText.replace(dateMatch[0], '').trim();
                }
                
                let cost: number | undefined = undefined;
                const costMatch = fullTaskText.match(costRegex);
                if (costMatch) {
                    cost = parseFloat(costMatch[1]);
                    fullTaskText = fullTaskText.replace(costMatch[0], '').trim();
                }

                let creationDate: string | null = null;
                const creationDateMatch = fullTaskText.match(creationDateRegex);
                if(creationDateMatch){
                    creationDate = creationDateMatch[1];
                    fullTaskText = fullTaskText.replace(creationDateMatch[0], '').trim();
                }

                let dueDate: string | null = null;
                const dueDateMatch = fullTaskText.match(dueDateRegex);
                if(dueDateMatch){
                    dueDate = dueDateMatch[1];
                    fullTaskText = fullTaskText.replace(dueDateMatch[0], '').trim();
                }
                
                let assignee: User | null = null;
                const assigneeMatch = fullTaskText.match(assigneeRegex);
                if (assigneeMatch) {
                    assignee = userByAlias.get(assigneeMatch[1]) || null;
                    fullTaskText = fullTaskText.replace(assigneeMatch[0], '').trim();
                }

                const taskRuns = createInlinesFromMarkdown(fullTaskText, completed ? { strike: true } : {});
                const taskTextChildren: (docx.TextRun | docx.ExternalHyperlink)[] = [ new docx.TextRun(completed ? '☑ ' : '☐ '), ...taskRuns ];
                
                if (cost !== undefined) {
                    taskTextChildren.push(new docx.TextRun({ text: ` ($${cost.toFixed(2)})`, color: '2E8B57', size: 18, italics: true }));
                }
                if (assignee) taskTextChildren.push(new docx.TextRun({ text: ` (${assignee.name})`, color: '808080', size: 18, italics: true }));

                if (creationDate) {
                    taskTextChildren.push(new docx.TextRun({ text: ` (Created: ${formatDate(creationDate)})`, color: '808080', size: 18, italics: true }));
                }
                if (dueDate && !completed) {
                    taskTextChildren.push(new docx.TextRun({ text: ` (Due: ${formatDate(dueDate)})`, color: 'A52A2A', size: 18, italics: true }));
                }
                if (completed && completionDate) {
                    taskTextChildren.push(new docx.TextRun({ text: ` (Completed: ${formatDate(completionDate)})`, color: '808080', size: 18, italics: true }));
                }
                projectPageChildren.push(new docx.Paragraph({ children: taskTextChildren, bullet: { level: 0 } }));
                
                let j = i + 1;
                while (j < lines.length) {
                    const updateLine = lines[j];
                    if (updateLine.trim() === '') { j++; continue; }
                    const updateMatch = updateLine.match(updateRegex);
                    if (updateMatch) {
                        let updateText = updateMatch[2].trim();
                        let updateAssignee: User | null = null;
                        const updateAssigneeMatch = updateText.match(assigneeRegex);
                        if (updateAssigneeMatch) {
                            updateAssignee = userByAlias.get(updateAssigneeMatch[1]) || null;
                            updateText = updateText.replace(assigneeRegex, '').trim();
                        }
                        const updateTextRuns = createInlinesFromMarkdown(updateText);
                        const updateChildren = [new docx.TextRun({ text: `${formatDate(updateMatch[1])}: `, italics: true, color: '808080'}), ...updateTextRuns];
                        if (updateAssignee) updateChildren.push(new docx.TextRun({ text: ` - ${updateAssignee.name}`, italics: true, color: '808080' }));
                        projectPageChildren.push(new docx.Paragraph({ children: updateChildren, bullet: { level: 1 } }));
                        j++;
                    } else break;
                }
                i = j;
                continue;
            }
            const h1Match = line.match(/^# (.*)/); if (h1Match) { projectPageChildren.push(new docx.Paragraph({ children: createInlinesFromMarkdown(h1Match[1]), heading: docx.HeadingLevel.HEADING_1 })); i++; continue; }
            const h2Match = line.match(/^## (.*)/); if (h2Match) { projectPageChildren.push(new docx.Paragraph({ children: createInlinesFromMarkdown(h2Match[1]), heading: docx.HeadingLevel.HEADING_2 })); i++; continue; }
            const h3Match = line.match(/^### (.*)/); if (h3Match) { projectPageChildren.push(new docx.Paragraph({ children: createInlinesFromMarkdown(h3Match[1]), heading: docx.HeadingLevel.HEADING_3 })); i++; continue; }
            const ulMatch = line.match(/^- (.*)/); if (ulMatch) { projectPageChildren.push(new docx.Paragraph({ children: createInlinesFromMarkdown(ulMatch[1]), bullet: { level: 0 } })); i++; continue; }
            projectPageChildren.push(new docx.Paragraph({ children: createInlinesFromMarkdown(line) }));
            i++;
        }

        const taskSummaryChildren: docx.Paragraph[] = [];
        taskSummaryChildren.push(new docx.Paragraph({ text: 'Task Summary', heading: docx.HeadingLevel.HEADING_1, spacing: { after: 200 } }));

        if (viewScope === 'all') {
            projects.forEach(project => {
                taskSummaryChildren.push(new docx.Paragraph({ text: project.title, heading: docx.HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
                // FIX: Add explicit type to lambda parameter to fix 'tasks' property does not exist on type 'unknown' error.
                const assignedUsersWithTasks = Object.values(project.groupedTasks).filter((g: { user: User; tasks: Task[] }) => g.tasks.length > 0);
                 assignedUsersWithTasks.forEach(({ user, tasks }) => {
                    taskSummaryChildren.push(new docx.Paragraph({ text: user.name, heading: docx.HeadingLevel.HEADING_3, spacing: { before: 300, after: 150 } }));
                    renderTasksForDocx(tasks, taskSummaryChildren);
                });

                if (project.unassignedTasks.length > 0) {
                    taskSummaryChildren.push(new docx.Paragraph({ text: 'Unassigned Tasks', heading: docx.HeadingLevel.HEADING_3, spacing: { before: 300, after: 150 } }));
                    renderTasksForDocx(project.unassignedTasks, taskSummaryChildren);
                }
            });
        } else { 
            taskSummaryChildren.push(new docx.Paragraph({ text: currentProject.title, heading: docx.HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
            // FIX: Add explicit type to lambda parameter to fix 'tasks' property does not exist on type 'unknown' error.
            const assignedUsersWithTasks = Object.values(currentProject.groupedTasks).filter((g: { user: User; tasks: Task[] }) => g.tasks.length > 0);
            assignedUsersWithTasks.forEach(({ user, tasks }) => {
                taskSummaryChildren.push(new docx.Paragraph({ text: user.name, heading: docx.HeadingLevel.HEADING_3, spacing: { before: 300, after: 150 } }));
                renderTasksForDocx(tasks, taskSummaryChildren);
            });

            if (currentProject.unassignedTasks.length > 0) {
                taskSummaryChildren.push(new docx.Paragraph({ text: 'Unassigned Tasks', heading: docx.HeadingLevel.HEADING_3, spacing: { before: 300, after: 150 } }));
                renderTasksForDocx(currentProject.unassignedTasks, taskSummaryChildren);
            }
        }
        
        const doc = new docx.Document({
            sections: [
                { children: projectPageChildren },
                { properties: { type: docx.SectionType.NEXT_PAGE }, children: taskSummaryChildren }
            ]
        });
        const blob = await docx.Packer.toBlob(doc);
        saveAs(blob, `${docTitle}.docx`);
        setIsOpen(false);
    }, [markdown, projects, currentProject, viewScope, userByAlias]);
    

    const handleImportClick = () => {
        fileInputRef.current?.click();
        setIsOpen(false);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            importProject(file);
        }
        if (event.target) event.target.value = '';
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".mdtasker,application/json" />
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="flex items-center space-x-2 px-4 py-2 rounded-md transition-colors font-semibold bg-slate-700 hover:bg-slate-600"
                aria-haspopup="true" aria-expanded={isOpen}
            >
                <BookUp className="w-4 h-4" />
                <span>Project Actions</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30">
                    <div className="p-2" role="menu" aria-orientation="vertical">
                        <div className="px-3 py-2 text-xs font-semibold text-slate-400">Project File</div>
                         <button onClick={handleImportClick} className="w-full text-left flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-slate-700 text-sm text-slate-200" role="menuitem">
                            <Upload className="w-4 h-4" /><span>Import Project (.mdtasker)</span>
                        </button>
                        <button onClick={handleExportProject} className="w-full text-left flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-slate-700 text-sm text-slate-200" role="menuitem">
                            <Download className="w-4 h-4" /><span>Export Project (.mdtasker)</span>
                        </button>
                        
                        <div className="border-t border-slate-700 my-2"></div>
                        <div className="px-3 py-2 text-xs font-semibold text-slate-400">Document Export</div>
                        <button onClick={handleDocxExport} className="w-full text-left flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-slate-700 text-sm text-slate-200" role="menuitem">
                           <FileText className="w-4 h-4" /> <span>Export as DOCX</span>
                        </button>

                        <div className="border-t border-slate-700 my-2"></div>
                        <div className="px-3 py-2 text-xs font-semibold text-slate-400">Reports</div>
                        <button onClick={() => { setIsDailyReportModalOpen(true); setIsOpen(false); }} className="w-full text-left flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-slate-700 text-sm text-slate-200" role="menuitem">
                            <CalendarDays className="w-4 h-4" /> <span>Export Daily Report...</span>
                        </button>

                    </div>
                </div>
            )}
             <DailyReportModal
                isOpen={isDailyReportModalOpen}
                onClose={() => setIsDailyReportModalOpen(false)}
                onGenerate={handleDailyReportExport}
            />
        </div>
    );
};

export default ProjectActions;