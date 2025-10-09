import React, { useMemo, useCallback, useState } from 'react';
import { useSectionParser, Section } from '../hooks/useSectionParser';
import type { User, Project, Heading, Task } from '../types';
import EditableSection from './EditableSection';
import { useProject } from '../contexts/ProjectContext';
import { Download, List, X } from 'lucide-react';
import saveAs from 'file-saver';
import ConfirmationModal from './ConfirmationModal';
import TableOfContents from './TableOfContents';


interface EditableDocumentViewProps {
  markdown: string;
  projects: Project[];
  viewScope: 'single' | 'all';
  currentProjectIndex: number;
  isArchiveView?: boolean;
  hideCompletedTasks?: boolean;
  showPinnedOnly?: boolean;
}

const EditableDocumentView: React.FC<EditableDocumentViewProps> = (props) => {
  const { markdown, projects, viewScope, currentProjectIndex, isArchiveView, hideCompletedTasks, showPinnedOnly } = props;
  const { users, updateSection, moveSection, duplicateSection, toggleTask, toggleTaskPin, updateTaskBlock, archiveSection, restoreSection, archiveTasks, reorderTask, archiveMarkdown, clearArchive } = useProject();
  const sections = useSectionParser(markdown);
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false);

  const handleExportArchive = useCallback(() => {
    if (!archiveMarkdown.trim()) {
        alert("Archive is empty. Nothing to export.");
        return;
    }
    const date = new Date().toISOString().split('T')[0];
    const filename = `${date}_Archive.md`;
    const blob = new Blob([archiveMarkdown], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, filename);
    setIsClearConfirmOpen(true);
  }, [archiveMarkdown]);

  const handleConfirmClearArchive = useCallback(() => {
      clearArchive();
      setIsClearConfirmOpen(false);
  }, [clearArchive]);

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
  
  const tocHeadingsForSidebar = useMemo(() => {
    if (isArchiveView) return [];
    if (viewScope === 'single' && projects[currentProjectIndex]) {
        const project = projects[currentProjectIndex];
        return [
            { text: project.title, slug: project.slug!, level: 1, line: project.startLine },
            ...project.headings
        ];
    }
    if (viewScope === 'all') {
        const allHeadings: Heading[] = projects.flatMap(p => [
            { text: p.title, slug: p.slug!, level: 1, line: p.startLine },
            ...p.headings
        ]);
        return allHeadings;
    }
    return [];
  }, [viewScope, projects, currentProjectIndex, isArchiveView]);
  
  const handleTocLinkClick = () => {
    setIsMobileTocOpen(false);
  };

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
  
  const handleToggleTaskPin = useCallback((lineIndex: number) => {
    toggleTaskPin(lineIndex);
  }, [toggleTaskPin]);

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
    <div className="h-full flex flex-row">
        {tocHeadingsForSidebar.length > 0 && !isArchiveView && (
            <aside className="hidden lg:block w-72 flex-shrink-0 h-full border-r border-slate-800">
                <div className="p-8 h-full overflow-y-auto">
                    <TableOfContents headings={tocHeadingsForSidebar} />
                </div>
            </aside>
        )}
        <div className="h-full overflow-y-auto flex-grow">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {isArchiveView && (
                  <div className="mb-8 pb-4 border-b border-slate-700">
                      <div className="flex justify-between items-center">
                          <div>
                              <h1 className="text-3xl font-bold text-slate-100">Archive</h1>
                              <p className="text-slate-400 mt-1">These sections have been archived. You can restore them to merge them back into the active project.</p>
                          </div>
                          <button
                            onClick={handleExportArchive}
                            disabled={!archiveMarkdown.trim()}
                            className="flex items-center space-x-2 px-4 py-2 rounded-md transition-colors font-semibold bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
                            title={!archiveMarkdown.trim() ? "Archive is empty" : "Export archive as a Markdown file"}
                          >
                            <Download className="w-4 h-4" />
                            <span>Export Archive</span>
                          </button>
                      </div>
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
                                onTogglePin={handleToggleTaskPin}
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
                                showPinnedOnly={showPinnedOnly}
                                isCollapsed={collapsedSections.has(section.startLine)}
                                onToggleCollapse={() => handleToggleCollapse(section.startLine)}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
        
        {/* Mobile TOC Button (FAB) */}
        {tocHeadingsForSidebar.length > 0 && !isArchiveView && (
            <button
                onClick={() => setIsMobileTocOpen(true)}
                className="lg:hidden fixed bottom-6 right-6 z-20 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500"
                aria-label="Open table of contents"
            >
                <List className="w-6 h-6" />
            </button>
        )}

        {/* Mobile TOC Modal/Overlay */}
        {isMobileTocOpen && (
            <div 
                className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-70"
                onClick={() => setIsMobileTocOpen(false)}
                role="dialog"
                aria-modal="true"
            >
                <div 
                    className="absolute inset-x-0 top-0 p-6 bg-slate-900 border-b border-slate-700 rounded-b-2xl shadow-2xl max-h-[80vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-100">Table of Contents</h2>
                        <button onClick={() => setIsMobileTocOpen(false)} className="p-1 rounded-full hover:bg-slate-700 text-slate-400" aria-label="Close table of contents">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    <TableOfContents headings={tocHeadingsForSidebar} onLinkClick={handleTocLinkClick} />
                </div>
            </div>
        )}

        {isArchiveView && (
            <ConfirmationModal
                isOpen={isClearConfirmOpen}
                onClose={() => setIsClearConfirmOpen(false)}
                onConfirm={handleConfirmClearArchive}
                title="Archive Exported"
                confirmText="Yes, Clear Archive"
                secondaryText="No, Keep Archive"
                onSecondaryAction={() => setIsClearConfirmOpen(false)}
            >
                <p>The archive has been successfully exported as a Markdown file.</p>
                <p className="mt-2 text-slate-400">Do you want to clear the archive content now?</p>
            </ConfirmationModal>
        )}
    </div>
  );
};

export default EditableDocumentView;