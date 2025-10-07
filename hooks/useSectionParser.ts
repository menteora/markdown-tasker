

import { useMemo } from 'react';
import type { Heading } from '../types';
import { remark } from 'remark';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import type { Root, Heading as MdastHeading } from 'mdast';

export interface Section {
  startLine: number;
  endLine: number;
  content: string;
  heading: Heading | null;
}

const simpleSlugify = (text: string): string => {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const useSectionParser = (markdown: string): Section[] => {
  return useMemo(() => {
    const lines = markdown.split('\n');
    const sections: Section[] = [];
    if (lines.length === 0 && markdown === '') return [];

    const processor = remark().use(remarkParse);
    const tree = processor.parse(markdown) as Root;

    const headingIndices: { line: number; level: number; text: string }[] = [];
    visit(tree, 'heading', (node: MdastHeading) => {
      // Only consider H1, H2, H3 as section dividers
      if (node.depth <= 3 && node.position) {
        headingIndices.push({
          line: node.position.start.line - 1,
          level: node.depth,
          text: toString(node).trim(),
        });
      }
    });

    if (headingIndices.length === 0) {
      sections.push({
        startLine: 0,
        endLine: lines.length - 1,
        content: markdown,
        heading: null,
      });
      return sections;
    }

    if (headingIndices[0].line > 0) {
      sections.push({
        startLine: 0,
        endLine: headingIndices[0].line - 1,
        content: lines.slice(0, headingIndices[0].line).join('\n'),
        heading: null,
      });
    }

    headingIndices.forEach((h, i) => {
      const startLine = h.line;
      const endLine = i < headingIndices.length - 1 ? headingIndices[i + 1].line - 1 : lines.length - 1;
      sections.push({
        startLine: startLine,
        endLine: endLine,
        content: lines.slice(startLine, endLine + 1).join('\n'),
        heading: {
          text: h.text,
          slug: simpleSlugify(h.text), // Slug doesn't need to be unique here
          level: h.level,
          line: h.line,
        },
      });
    });

    return sections;
  }, [markdown]);
};