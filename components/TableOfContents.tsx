import React from 'react';
import type { Heading } from '../types';
import { BookMarked } from 'lucide-react';

interface TableOfContentsProps {
  headings: Heading[];
  onLinkClick?: () => void;
}

const TableOfContents: React.FC<TableOfContentsProps> = ({ headings, onLinkClick }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    e.preventDefault();
    const element = document.getElementById(slug);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
        
        const parentSection = element.closest('.group');
        if (parentSection) {
            parentSection.classList.add('highlight-section');
            setTimeout(() => {
                parentSection.classList.remove('highlight-section');
            }, 2000);
        }
    }
    onLinkClick?.();
  };

  if (headings.length === 0) {
    return null;
  }

  const minLevel = headings.length > 0 ? Math.min(...headings.map(h => h.level)) : 1;

  return (
    <nav className="sticky top-8">
      <h4 className="font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center text-xs">
        <BookMarked className="w-4 h-4 mr-2 text-slate-500" />
        On this page
      </h4>
      <ul className="space-y-1 border-l border-slate-700">
        {headings.map((heading) => (
          <li key={heading.slug}>
            <a
              href={`#${heading.slug}`}
              onClick={(e) => handleLinkClick(e, heading.slug)}
              className="flex items-start text-sm text-slate-400 hover:text-indigo-400 transition-colors py-1 -ml-px border-l-2 border-transparent hover:border-indigo-400"
              style={{ paddingLeft: `${(heading.level - minLevel) * 16 + 16}px` }}
            >
               <span className="flex-grow leading-tight">{heading.text}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default TableOfContents;