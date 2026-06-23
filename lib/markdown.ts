// ponytail: minimal markdown for author-controlled scenario text, not a general parser.
// Handles the subset Claude-style answers use: ## / ### headings, **bold**, `code`,
// ordered + unordered lists, and ``` fenced code blocks. Returns an AST so the renderer
// stays a thin component and the parsing stays unit-testable without a DOM.

export type MdInline =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'code'; value: string };

export type MdBlock =
  | { kind: 'heading'; level: 2 | 3; spans: MdInline[] }
  | { kind: 'paragraph'; spans: MdInline[] }
  | { kind: 'list'; ordered: boolean; items: MdInline[][] }
  | { kind: 'code'; language?: string; value: string };

export function parseInline(text: string): MdInline[] {
  const spans: MdInline[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      spans.push({ kind: 'text', value: text.slice(last, match.index) });
    }
    const token = match[0];
    if (token.startsWith('**')) {
      spans.push({ kind: 'bold', value: token.slice(2, -2) });
    } else {
      spans.push({ kind: 'code', value: token.slice(1, -1) });
    }
    last = match.index + token.length;
  }
  if (last < text.length) {
    spans.push({ kind: 'text', value: text.slice(last) });
  }
  return spans.length ? spans : [{ kind: 'text', value: text }];
}

export function parseMarkdown(source: string): MdBlock[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: MdBlock[] = [];
  let paragraph: string[] = [];
  let i = 0;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: 'paragraph', spans: parseInline(paragraph.join(' ').trim()) });
      paragraph = [];
    }
  };

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (trimmed.startsWith('```')) {
      flushParagraph();
      const language = trimmed.slice(3).trim() || undefined;
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ kind: 'code', language, value: body.join('\n') });
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      i += 1;
      continue;
    }

    const heading = /^(#{2,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      blocks.push({ kind: 'heading', level: heading[1].length as 2 | 3, spans: parseInline(heading[2]) });
      i += 1;
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      const items: MdInline[][] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(parseInline(lines[i].trim().replace(/^\d+\.\s+/, '')));
        i += 1;
      }
      blocks.push({ kind: 'list', ordered: true, items });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      const items: MdInline[][] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(parseInline(lines[i].trim().replace(/^[-*]\s+/, '')));
        i += 1;
      }
      blocks.push({ kind: 'list', ordered: false, items });
      continue;
    }

    paragraph.push(trimmed);
    i += 1;
  }

  flushParagraph();
  return blocks;
}
