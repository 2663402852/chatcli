import { Marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import chalk from 'chalk';
import { getTerminalWidth } from './terminal.js';

// Create a new marked instance with current width
const createMarked = () => {
  const m = new Marked();
  m.use(markedTerminal({
    width: getTerminalWidth() - 8,
    reflowText: false,
    showSectionPrefix: false,
    tab: 2,
    // Headings
    firstHeading: (text: string) => chalk.bold.underline(text),
    heading: (text: string) => chalk.bold(text),
    // Code
    code: (text: string) => chalk.cyan(text),
    codespan: (text: string) => chalk.cyan(text),
    // Text styles
    strong: (text: string) => chalk.bold(text),
    em: (text: string) => chalk.italic(text),
    del: (text: string) => chalk.strikethrough(text),
    // Blockquote
    blockquote: (text: string) => chalk.italic.gray(text),
    // Links
    href: (text: string) => chalk.blue.underline(text),
    // HR
    hr: () => chalk.dim('─'.repeat(getTerminalWidth() - 8)),
  }));
  return m;
};

let marked = createMarked();

// Recreate on terminal resize
if (typeof process.stdout.on === 'function') {
  process.stdout.on('resize', () => {
    marked = createMarked();
  });
}

// Pre-process math formulas to protect them from markdown parsing
const protectMath = (text: string): string => {
  // Protect display math $$...$$
  let result = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    return `\n\`\`\`math\n${math.trim()}\n\`\`\`\n`;
  });
  // Protect inline math $...$
  result = result.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
    return `\`${math}\``;
  });
  return result;
};

export const renderMarkdown = (text: string): string => {
  try {
    const protected_text = protectMath(text);
    const result = marked.parse(protected_text);
    return typeof result === 'string' ? result : text;
  } catch {
    return text;
  }
};
