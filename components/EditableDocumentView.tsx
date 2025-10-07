

import React, { useMemo, useCallback } from 'react';
import { useSectionParser } from '../hooks/useSectionParser';
import type { User, Project, Heading } from '../types';
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
  const { users, updateSection, moveSection, duplicateSection, toggleTask, updateTaskBlock, archiveSection, restoreSection } = useProject();
  const sections = useSectionParser(markdown);

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
    const absoluteLineIndex = (viewScope === 'single' && projects[currentProjectIndex] && !isArchiveView)
      ? projects[currentProjectIndex].startLine + lineIndex
      : lineIndex;
    toggleTask(absoluteLineIndex, isCompleted);
  }, [viewScope, currentProjectIndex, projects, toggleTask, isArchiveView]);

  const handleUpdateTaskBlock = useCallback((startLine: number, lineCount: number, newContent: string) => {
    const absoluteStartLine = (viewScope === 'single' && projects[currentProjectIndex] && !isArchiveView)
      ? projects[currentProjectIndex].startLine + startLine
      : startLine;
    updateTaskBlock(absoluteStartLine, lineCount, newContent, !!isArchiveView);
  }, [viewScope, currentProjectIndex, projects, updateTaskBlock, isArchiveView]);
  
  const handleArchiveSection = useCallback((startLine: number, endLine: number, projectTitle: string) => {
      const absoluteStartLine = (viewScope === 'single' && projects[currentProjectIndex]) ? projects[currentProjectIndex].startLine + startLine : startLine;
      const absoluteEndLine = (viewScope === 'single' && projects[currentProjectIndex]) ? projects[currentProjectIndex].startLine + endLine : endLine;
      archiveSection({ startLine: absoluteStartLine, endLine: absoluteEndLine }, projectTitle);
  }, [viewScope, currentProjectIndex, projects, archiveSection]);

  const handleRestoreSection = useCallback((startLine: number, endLine: number, projectTitle: string) => {
      // In archive view, startLine is already absolute
      restoreSection({ startLine, endLine }, projectTitle);
  }, [restoreSection]);


  return (
    <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {sections.length === 0 && (
                <div className="text-center text-slate-500 py-16">
                    <h2 className="text-2xl font-semibold">{isArchiveView ? "L'archivio è vuoto" : "Nessun contenuto"}</h2>
                    <p>{isArchiveView ? "Le sezioni completate e archiviate appariranno qui." : "Inizia aggiungendo del contenuto."}</p>
                </div>
            )}
            <div className="space-y-4">
                {sections.map((section, index) => {
                    const projectForSection = projects.find(p => section.startLine >= p.startLine && section.startLine <= p.endLine);
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
                            tocHeadings={tocHeadings}
                            users={users}
                            viewScope={viewScope}
                            project={projectForSection}
                            isArchiveView={isArchiveView}
                            hideCompletedTasks={hideCompletedTasks}
                        />
                    );
                })}
            </div>
        </div>
    </div>
  );
};

export default EditableDocumentView;