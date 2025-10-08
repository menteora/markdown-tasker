import { useMemo } from 'react';
import { User, Task, GroupedTasks, TaskUpdate, Project, Heading } from '../types';
import { remark } from 'remark';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import type { Root, Heading as MdastHeading, ListItem, Paragraph } from 'mdast';

const slugify = (text: string, existingSlugs: Set<string>): string => {
  let slug = text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) {
      slug = 'section';
  }

  if (existingSlugs.has(slug)) {
    let counter = 2;
    let newSlug = `${slug}-${counter}`;
    while (existingSlugs.has(newSlug)) {
      counter++;
      newSlug = `${slug}-${counter}`;
    }
    slug = newSlug;
  }
  
  existingSlugs.add(slug);
  return slug;
};


export const useMarkdownParser = (markdown: string, users: User[]): Project[] => {
    return useMemo(() => {
        const lines = markdown.split('\n');
        const processor = remark().use(remarkParse).use(remarkGfm);
        const stringifier = remark().use(remarkStringify);
        const tree = processor.parse(markdown) as Root;
        const existingSlugs = new Set<string>();
        
        // Step 1: Initialize projects based on H1 headings
        let projects: Project[] = [];
        const projectBoundaries: { title: string, startLine: number }[] = [];

        visit(tree, 'heading', (node: MdastHeading) => {
            if (node.depth === 1 && node.position) {
                projectBoundaries.push({
                    title: toString(node).trim(),
                    startLine: node.position.start.line - 1,
                });
            }
        });

        if (projectBoundaries.length === 0) {
            projects.push({ title: 'Project Overview', slug: 'project-overview', startLine: 0, endLine: lines.length - 1, headings: [], groupedTasks: {}, unassignedTasks: [], totalCost: 0 });
        } else {
            projectBoundaries.forEach((boundary, idx) => {
                const endLine = (idx + 1 < projectBoundaries.length) ? projectBoundaries[idx + 1].startLine - 1 : lines.length - 1;
                const slug = slugify(boundary.title, existingSlugs);
                projects.push({ title: boundary.title, slug, startLine: boundary.startLine, endLine: endLine, headings: [], groupedTasks: {}, unassignedTasks: [], totalCost: 0 });
            });
        }

        // Initialize user groups for each project
        projects.forEach(p => {
            p.groupedTasks = users.reduce((acc, user) => ({ ...acc, [user.alias]: { user, tasks: [] } }), {} as GroupedTasks);
        });

        // Step 2: Traverse the tree to find headings and tasks
        const headingStack: { text: string; level: number }[] = [];
        
        const assigneeRegex = /\s\(@([a-zA-Z0-9_]+)\)/;
        const dateRegex = /\s~([0-9]{4}-[0-9]{2}-[0-9]{2})/;
        const costRegex = /\s\(\$(\d+(\.\d{1,2})?)\)/;
        const creationDateRegex = /\s\+([0-9]{4}-[0-9]{2}-[0-9]{2})/;
        const dueDateRegex = /\s!([0-9]{4}-[0-9]{2}-[0-9]{2})/;
        const updateContentRegex = /^(\d{4}-\d{2}-\d{2}): (.*)/;


        visit(tree, (node) => {
            if (!node.position) return;
            
            const nodeLine = node.position.start.line - 1;
            const projectIdx = projects.findIndex(p => nodeLine >= p.startLine && nodeLine <= p.endLine);
            if (projectIdx === -1 && projects.length === 1 && projects[0].title === 'Project Overview') {
                // Fallback for file without H1
            } else if (projectIdx === -1) {
                return;
            }


            if (node.type === 'heading') {
                const level = node.depth;
                const text = toString(node).trim();

                while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
                    headingStack.pop();
                }
                headingStack.push({ text, level });

                const headingData: Heading = { text, slug: slugify(text, existingSlugs), level, line: node.position.start.line - 1 };
                if (level > 1 && level <= 3) {
                     projects[projectIdx].headings.push(headingData);
                }
            }
            
            if (node.type === 'listItem' && typeof node.checked === 'boolean') {
                const paragraphNode = node.children.find(child => child.type === 'paragraph') as Paragraph | undefined;
                if (!paragraphNode) return;

                let fullTaskText = stringifier.stringify(paragraphNode).trim();

                let assigneeAlias: string | null = null;
                let completionDate: string | null = null;
                let creationDate: string | null = null;
                let cost: number | undefined = undefined;
                let dueDate: string | null = null;

                const dateMatch = fullTaskText.match(dateRegex);
                if (dateMatch) { completionDate = dateMatch[1]; fullTaskText = fullTaskText.replace(dateRegex, '').trim(); }
                
                const costMatch = fullTaskText.match(costRegex);
                if (costMatch) { cost = parseFloat(costMatch[1]); fullTaskText = fullTaskText.replace(costRegex, '').trim(); }

                const assigneeMatch = fullTaskText.match(assigneeRegex);
                if (assigneeMatch) { assigneeAlias = assigneeMatch[1]; fullTaskText = fullTaskText.replace(assigneeRegex, '').trim(); }
                
                const creationDateMatch = fullTaskText.match(creationDateRegex);
                if (creationDateMatch) { creationDate = creationDateMatch[1]; fullTaskText = fullTaskText.replace(creationDateRegex, '').trim(); }

                const dueDateMatch = fullTaskText.match(dueDateRegex);
                if (dueDateMatch) { dueDate = dueDateMatch[1]; fullTaskText = fullTaskText.replace(dueDateRegex, '').trim(); }

                const updates: TaskUpdate[] = [];
                visit(node, 'list', (listNode) => {
                    visit(listNode, 'listItem', (updateItemNode: ListItem) => {
                        if (updateItemNode.position) {
                            const updateTextContent = toString(updateItemNode);
                            const updateMatch = updateTextContent.match(updateContentRegex);

                            if (updateMatch) {
                                let updateText = updateMatch[2].trim();
                                let updateAssigneeAlias: string | null = null;
                                const updateAssigneeMatch = updateText.match(assigneeRegex);
                                if(updateAssigneeMatch){ updateAssigneeAlias = updateAssigneeMatch[1]; updateText = updateText.replace(assigneeRegex, '').trim(); }

                                updates.push({
                                    lineIndex: updateItemNode.position.start.line - 1,
                                    date: updateMatch[1],
                                    text: updateText,
                                    assigneeAlias: updateAssigneeAlias,
                                });
                            }
                        }
                    });
                    // Stop recursion into deeper nested lists
                    return 'skip';
                });
                
                const currentProject = projects[projectIdx];
                const currentProjectTitle = currentProject?.title || 'Project Overview';
                const sectionHeading = headingStack.length > 1 ? headingStack[headingStack.length - 1] : null;

                const task: Task = {
                    lineIndex: node.position.start.line - 1,
                    text: fullTaskText,
                    completed: node.checked,
                    assigneeAlias,
                    creationDate,
                    completionDate,
                    dueDate,
                    updates,
                    projectTitle: currentProjectTitle,
                    projectSlug: currentProject?.slug,
                    cost,
                    blockEndLine: node.position.end.line - 1,
                    sectionTitle: sectionHeading?.text,
                    sectionSlug: sectionHeading ? slugify(sectionHeading.text, new Set()) : undefined, // slug here is just for convenience, not for TOC
                    headingHierarchy: [...headingStack],
                };
                
                if (task.cost) projects[projectIdx].totalCost += task.cost;
                if (task.assigneeAlias && projects[projectIdx].groupedTasks[task.assigneeAlias]) {
                    projects[projectIdx].groupedTasks[task.assigneeAlias].tasks.push(task);
                } else {
                    projects[projectIdx].unassignedTasks.push(task);
                }
            }
        });

        return projects;
    }, [markdown, users]);
};
