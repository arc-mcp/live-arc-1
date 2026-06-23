import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown } from '../lib/markdown';

describe('markdown parser', () => {
  it('splits inline bold and code', () => {
    expect(parseInline('keep **ZIF_BILLING** but read `process()`')).toEqual([
      { kind: 'text', value: 'keep ' },
      { kind: 'bold', value: 'ZIF_BILLING' },
      { kind: 'text', value: ' but read ' },
      { kind: 'code', value: 'process()' }
    ]);
  });

  it('parses headings, ordered lists and paragraphs', () => {
    const blocks = parseMarkdown('Here is the plan.\n\n## Plan\n\n1. First **step**\n2. Second step');
    expect(blocks.map((block) => block.kind)).toEqual(['paragraph', 'heading', 'list']);
    const list = blocks[2];
    expect(list.kind === 'list' && list.ordered).toBe(true);
    expect(list.kind === 'list' && list.items.length).toBe(2);
  });

  it('keeps fenced code verbatim', () => {
    const blocks = parseMarkdown('intro\n\n```abap\nSELECT * FROM zdm_project.\n```');
    const code = blocks[1];
    expect(code.kind).toBe('code');
    expect(code.kind === 'code' && code.value).toBe('SELECT * FROM zdm_project.');
    expect(code.kind === 'code' && code.language).toBe('abap');
  });

  it('groups unordered list items and stops at blank line', () => {
    const blocks = parseMarkdown('- one\n- two\n\nafter');
    expect(blocks.map((block) => block.kind)).toEqual(['list', 'paragraph']);
    const list = blocks[0];
    expect(list.kind === 'list' && list.ordered).toBe(false);
    expect(list.kind === 'list' && list.items.length).toBe(2);
  });
});
