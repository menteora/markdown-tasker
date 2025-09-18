import React, { useState, useRef, useEffect } from 'react';
import { Section } from '../hooks/useSectionParser';
import { ChevronsUpDown, CornerDownRight, ArrowUpToLine } from 'lucide-react';

interface MoveSectionControlProps {
    allSections: Section[];
    currentSectionIndex: number;
    onMoveSection: (destinationLine: number) => void;
}

const MoveSectionControl: React.FC<MoveSectionControlProps> = ({ allSections, currentSectionIndex, onMoveSection }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMove = (destinationLine: number) => {
        onMoveSection(destinationLine);
        setIsOpen(false);
    };

    const currentSection = allSections[currentSectionIndex];
    if (!currentSection) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(p => !p)}
                className="p-2 rounded-full bg-slate-700/50 text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 hover:bg-indigo-600 hover:text-white"
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-label="Move section"
                title="Move section"
            >
                <ChevronsUpDown className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30" role="menu">
                    <div className="p-1">
                        <div className="px-2 py-1 text-xs font-semibold text-slate-400">Move section after...</div>
                        
                        {currentSectionIndex > 0 && (
                            <button
                                onClick={() => handleMove(0)}
                                className="w-full text-left flex items-center px-3 py-2 text-sm rounded-md text-slate-200 hover:bg-slate-700"
                                role="menuitem"
                            >
                                <ArrowUpToLine className="w-4 h-4 mr-2 flex-shrink-0" />
                                Top of file
                            </button>
                        )}
                        
                        {allSections.map((section, index) => {
                            if (index === currentSectionIndex || index === currentSectionIndex - 1) {
                                return null;
                            }

                            const sectionTitle = section.heading?.text || 'Preamble';
                            
                            return (
                                <button
                                    key={section.startLine}
                                    onClick={() => handleMove(section.endLine + 1)}
                                    className="w-full text-left flex items-center px-3 py-2 text-sm rounded-md text-slate-200 hover:bg-slate-700"
                                    role="menuitem"
                                    title={`After: "${sectionTitle}"`}
                                >
                                    <CornerDownRight className="w-4 h-4 mr-2 flex-shrink-0" />
                                    <span className="truncate">"{sectionTitle}"</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MoveSectionControl;