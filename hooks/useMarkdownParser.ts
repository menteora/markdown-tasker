import { useMemo } from 'react';
import { User, Task, GroupedTasks, TaskUpdate, Project } from '../types';

export const useMarkdownParser = (markdown: string, users: User[]): Project[] => {
    return useMemo(() => {
        const lines = markdown.split('\n');
        const projects: Project[] = [];
        
        const projectBoundaries: { title: string, startLine: number }[] = [];

        lines.forEach((line, index) => {
            const h1Match = line.match(/^# (.*)/);
            if (h1Match) {
                projectBoundaries.push({ title: h1Match[1].trim(), startLine: index });
            }
        });

        if (projectBoundaries.length === 0) {
            projectBoundaries.push({ title: 'Project Overview', startLine: 0 });
        }

        projectBoundaries.forEach((boundary, idx) => {
            const startLine = boundary.startLine;
            const endLine = (idx + 1 < projectBoundaries.length) ? projectBoundaries[idx + 1].startLine - 1 : lines.length - 1;
            
            const projectLines = lines.slice(startLine, endLine + 1);
            const currentProjectTasks: Task[] = [];
            
            const taskRegex = /^- \[( |x)\] (.*)/;
            const assigneeRegex = /\s\(@([a-zA-Z0-9_]+)\)/;
            const dateRegex = /\s~([0-9]{4}-[0-9]{2}-[0-9]{2})$/;
            const costRegex = /\s\(\$(\d+(\.\d{1,2})?)\)$/;
            const updateRegex = /^  - (\d{4}-\d{2}-\d{2}): (.*)/;
            
            let i = 0;
            while (i < projectLines.length) {
                const line = projectLines[i];
                const absoluteLineIndex = startLine + i;
                const taskMatch = line.match(taskRegex);

                if (taskMatch) {
                    let fullTaskText = taskMatch[2];
                    let assigneeAlias: string | null = null;
                    let completionDate: string | null = null;
                    let cost: number | undefined = undefined;

                    const dateMatch = fullTaskText.match(dateRegex);
                    if (dateMatch) { completionDate = dateMatch[1]; fullTaskText = fullTaskText.replace(dateRegex, '').trim(); }
                    
                    const costMatch = fullTaskText.match(costRegex);
                    if (costMatch) { cost = parseFloat(costMatch[1]); fullTaskText = fullTaskText.replace(costRegex, '').trim(); }

                    const assigneeMatch = fullTaskText.match(assigneeRegex);
                    if (assigneeMatch) { assigneeAlias = assigneeMatch[1]; fullTaskText = fullTaskText.replace(assigneeRegex, '').trim(); }

                    const updates: TaskUpdate[] = [];
                    let j = i + 1;
                    while (j < projectLines.length) {
                        const updateLine = projectLines[j];
                        const updateMatch = updateLine.match(updateRegex);
                        if (updateMatch) {
                            let updateText = updateMatch[2].trim();
                            let updateAssigneeAlias: string | null = null;
                            const updateAssigneeMatch = updateText.match(assigneeRegex);
                            if(updateAssigneeMatch){ updateAssigneeAlias = updateAssigneeMatch[1]; updateText = updateText.replace(assigneeRegex, '').trim(); }
                            
                            updates.push({
                                lineIndex: startLine + j,
                                date: updateMatch[1],
                                text: updateText,
                                assigneeAlias: updateAssigneeAlias,
                            });
                            j++;
                        } else {
                             if (updateLine.trim() !== '') break;
                             j++;
                        }
                    }
                    
                    currentProjectTasks.push({
                        lineIndex: absoluteLineIndex,
                        text: fullTaskText,
                        completed: taskMatch[1] === 'x',
                        assigneeAlias,
                        completionDate,
                        updates,
                        projectTitle: boundary.title,
                        cost,
                    });
                    i = j;
                } else {
                    i++;
                }
            }

            const groupedTasks: GroupedTasks = users.reduce((acc, user) => ({ ...acc, [user.alias]: { user, tasks: [] } }), {} as GroupedTasks);
            const unassignedTasks: Task[] = [];
            let totalCost = 0;
            currentProjectTasks.forEach(task => {
                if (task.cost) totalCost += task.cost;
                if (task.assigneeAlias && groupedTasks[task.assigneeAlias]) {
                    groupedTasks[task.assigneeAlias].tasks.push(task);
                } else {
                    unassignedTasks.push(task);
                }
            });

            projects.push({
                title: boundary.title,
                groupedTasks,
                unassignedTasks,
                totalCost,
                startLine,
                endLine,
            });
        });
        
        return projects.length > 0 ? projects : [{ title: 'Project Overview', groupedTasks: {}, unassignedTasks: [], totalCost: 0, startLine: 0, endLine: lines.length - 1 }];
    }, [markdown, users]);
};