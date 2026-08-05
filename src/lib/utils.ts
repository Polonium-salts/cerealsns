import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import DOMPurify from 'dompurify';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeMarkdown(content: string): string {
  if (!content) return '';
  return DOMPurify.sanitize(content, {
    FORCE_BODY: true,
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'span', 'div', 'ul', 'ol', 'li', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 
      'blockquote', 'code', 'pre', 'a', 'img', 'kbd', 'sub', 'sup', 'del', 'details', 'summary'
    ],
    ALLOWED_ATTR: ['href', 'target', 'src', 'alt', 'title', 'class', 'className', 'id', 'rel', 'style']
  }) as string;
}
