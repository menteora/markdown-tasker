import React from 'react';

/**
 * Parses a string with inline markdown (bold, italic, links) into an array of React nodes.
 * @param text The string to parse.
 * @returns An array of React nodes.
 */
export const parseInlineMarkdown = (text: string): React.ReactNode[] => {
  if (!text) return [];
  // Regex to split by bold, italic, or link, keeping the delimiters
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g);
  
  return parts.map((part, index) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**')) {
      // FIX: Use React.createElement to avoid JSX syntax errors in .ts file.
      return React.createElement('strong', { key: index }, part.slice(2, -2));
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*')) {
      // FIX: Use React.createElement to avoid JSX syntax errors in .ts file.
      return React.createElement('em', { key: index }, part.slice(1, -1));
    }

    // Link: [text](url)
    const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      // FIX: Use React.createElement to avoid JSX syntax errors in .ts file.
      return React.createElement('a', { key: index, href: linkMatch[2], target: "_blank", rel: "noopener noreferrer", className: "text-indigo-400 hover:underline" }, linkMatch[1]);
    }

    // Plain text
    return part;
  });
};

/**
 * A React component that renders a string with inline markdown.
 */
export const InlineMarkdown: React.FC<{ text: string }> = ({ text }) => {
    // FIX: Use React.createElement to avoid JSX syntax errors in .ts file.
    return React.createElement(React.Fragment, null, ...parseInlineMarkdown(text));
};

/**
 * Converts markdown syntax (specifically links) to a plain text format suitable for email clients.
 * @param text The markdown string to format.
 * @returns A plain text string.
 */
export const formatMarkdownForEmail = (text: string): string => {
  if (!text) return '';
  const linkRegex = /\[(.*?)\]\((.*?)\)/g;
  // Replaces [link text](url) with "link text (url)"
  return text.replace(linkRegex, (_match, linkText, url) => `${linkText} (${url})`);
};
