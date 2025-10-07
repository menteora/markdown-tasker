import React, { useMemo, useCallback, useState } from 'react';
import { useSectionParser, Section } from '../hooks/useSectionParser';
import type { User, Project, Heading, Task } from '../types';
import EditableSection from './EditableSection';
import { useProject } from '../contexts/ProjectContext';

interface EditableDocumentViewProps {
  markdown: string;
  projects: Project[];
  viewScope: 'single' | 'all';
  currentProjectIndex: number;
  isArchiveView?: boolean;
  hideCompletedTasks?: boolean;
}

const EditableDocumentView: React.FC<EditableDocumentViewProps> = (props) => {
  const { markdown, projects, viewScope, currentProjectIndex, isArchiveView, hideCompletedTasks } = props;
  const { users, updateSection, moveSection, duplicateSection, toggleTask, updateTaskBlock, archiveSection, restoreSection, archiveTasks, reorderTask } = useProject();
  const sections = useSectionParser(markdown);
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());

  const handleToggleCollapse = useCallback((sectionStartLine: number) => {
    setCollapsedSections(prev => {
        const newSet = new Set(prev);
        if (newSet.has(sectionStartLine)) {
            newSet.delete(sectionStartLine);
        } else {
            newSet.add(sectionStartLine);
        }
        return newSet;
    });
  }, []);
  
  const processedSections = useMemo(() => {
    const result: { section: Section, isVisible: boolean }[] = [];
    let collapsedLevel: number | null = null;

    for (const section of sections) {
        const sectionLevel = section.heading?.level;
        let isVisible = true;

        if (collapsedLevel !== null && sectionLevel && sectionLevel > collapsedLevel) {
            isVisible = false;
        } else {
            collapsedLevel = null;
        }
        
        result.push({ section, isVisible });

        if (collapsedSections.has(section.startLine) && sectionLevel) {
            collapsedLevel = sectionLevel;
        }
    }
    return result;
  }, [sections, collapsedSections]);

  const projectStartLine = useMemo(() => {
    if (viewScope === 'single' && projects[currentProjectIndex] && !isArchiveView) {
        return projects[currentProjectIndex].startLine;
    }
    return 0;
  }, [viewScope, projects, currentProjectIndex, isArchiveView]);
  
  const handleMoveSectionWithOffset = useCallback((sectionToMove: {startLine: number, endLine: number}, destinationLine: number) => {
      const absoluteSectionToMove = {
          startLine: sectionToMove.startLine + projectStartLine,
          endLine: sectionToMove.endLine + projectStartLine,
      };
      const absoluteDestinationLine = destinationLine > 0 ? destinationLine + projectStartLine : 0;
      moveSection(absoluteSectionToMove, absoluteDestinationLine);
  }, [projectStartLine, moveSection]);

  const handleDuplicateSectionWithOffset = useCallback((sectionToDuplicate: {startLine: number, endLine: number}, destinationLine: number) => {
      const absoluteSectionToDuplicate = {
          startLine: sectionToDuplicate.startLine + projectStartLine,
          endLine: sectionToDuplicate.endLine + projectStartLine,
      };
      const absoluteDestinationLine = destinationLine > 0 ? destinationLine + projectStartLine : 0;
      duplicateSection(absoluteSectionToDuplicate, absoluteDestinationLine);
  }, [projectStartLine, duplicateSection]);

  const handleUpdateSection = useCallback((startLine: number, endLine: number, newContent: string) => {
    const absoluteStartLine = (viewScope === 'single' && projects[currentProjectIndex] && !isArchiveView) ? projects[currentProjectIndex].startLine + startLine : startLine;
    const absoluteEndLine = (viewScope === 'single' && projects[currentProjectIndex] && !isArchiveView) ? projects[currentProjectIndex].startLine + endLine : endLine;
    updateSection(absoluteStartLine, absoluteEndLine, newContent, !!isArchiveView);
  }, [viewScope, currentProjectIndex, projects, updateSection, isArchiveView]);

  const handleToggleTask = useCallback((lineIndex: number, isCompleted: boolean) => {
    // lineIndex received from InteractiveTaskItem is already absolute
    toggleTask(lineIndex, isCompleted);
  }, [toggleTask]);

  const handleUpdateTaskBlock = useCallback((startLine: number, lineCount: number, newContent: string) => {
    // startLine received from InteractiveTaskItem is already an absolute line index
    updateTaskBlock(startLine, lineCount, newContent, !!isArchiveView);
  }, [updateTaskBlock, isArchiveView]);
  
  const handleArchiveSection = useCallback((startLine: number, endLine: number, projectTitle: string) => {
      const absoluteStartLine = (viewScope === 'single' && projects[currentProjectIndex]) ? projects[currentProjectIndex].startLine + startLine : startLine;
      const absoluteEndLine = (viewScope === 'single' && projects[currentProjectIndex]) ? projects[currentProjectIndex].startLine + endLine : endLine;
      archiveSection({ startLine: absoluteStartLine, endLine: absoluteEndLine }, projectTitle);
  }, [viewScope, currentProjectIndex, projects, archiveSection]);

  const handleRestoreSection = useCallback((startLine: number, endLine: number) => {
      restoreSection({ startLine, endLine });
  }, [restoreSection]);
  
  const handleArchiveTasks = useCallback((tasks: Task[]) => {
      archiveTasks(tasks);
  }, [archiveTasks]);

  const handleReorderTask = useCallback((task: Task, direction: 'up' | 'down' | 'top' | 'bottom') => {
      reorderTask(task, direction);
  }, [reorderTask]);


  return (
    <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {isArchiveView && (
              <div className="mb-8 pb-4 border-b border-slate-700">
                  <h1 className="text-3xl font-bold text-slate-100">Archive</h1>
                  <p className="text-slate-400 mt-1">These sections have been archived. You can restore them to merge them back into the active project.</p>
              </div>
            )}
            {(sections.length === 0 || (sections.length === 1 && !sections[0].content.trim())) && (
                <div className="text-center text-slate-500 py-16">
                    <h2 className="text-2xl font-semibold">{isArchiveView ? "The Archive is Empty" : "No Content"}</h2>
                    <p>{isArchiveView ? "Completed and archived sections will appear here." : "Start by adding some content in the editor."}</p>
                </div>
            )}
            <div className="space-y-4">
                {processedSections.map(({ section, isVisible }, index) => {
                    if (!isVisible || !section.content.trim()) return null;
                    
                    const projectForSection = (viewScope === 'single' && projects[currentProjectIndex] && !isArchiveView)
                      ? projects[currentProjectIndex]
                      : projects.find(p => section.startLine >= p.startLine && section.startLine <= p.endLine);
                    
                    const tocHeadings = projectForSection?.headings;

                    return (
                        <EditableSection
                            key={section.heading?.text ? `${section.heading.text}-${section.startLine}` : section.startLine}
                            section={section}
                            sectionIndex={index}
                            allSections={sections}
                            onSectionUpdate={handleUpdateSection}
                            onMoveSection={handleMoveSectionWithOffset}
                            onDuplicateSection={handleDuplicateSectionWithOffset}
                            onToggle={handleToggleTask}
                            onUpdateTaskBlock={handleUpdateTaskBlock}
                            onArchiveSection={handleArchiveSection}
                            onRestoreSection={handleRestoreSection}
                            onArchiveTasks={handleArchiveTasks}
                            onReorderTask={handleReorderTask}
                            tocHeadings={tocHeadings}
                            users={users}
                            viewScope={viewScope}
                            project={projectForSection}
                            projectStartLine={projectStartLine}
                            isArchiveView={isArchiveView}
                            hideCompletedTasks={hideCompletedTasks}
                            isCollapsed={collapsedSections.has(section.startLine)}
                            onToggleCollapse={() => handleToggleCollapse(section.startLine)}
                        />
                    );
                })}
            </div>
        </div>
    </div>
  );
};

export default EditableDocumentView;