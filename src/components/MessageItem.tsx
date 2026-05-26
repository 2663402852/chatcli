import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../lib/types.js';
import { renderMarkdown } from '../lib/markdown.js';

interface Props {
  message: Message;
  modelName?: string;
  isStreaming?: boolean;
  streamContent?: string;
}

function formatTime(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return '';
  }
}

// Estimate reading time based on content length
function estimateReadTime(content: string): string {
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / 200); // ~200 words per minute
  return minutes < 1 ? '<1 min read' : `${minutes} min read`;
}

export function MessageItem({ message, modelName, isStreaming, streamContent }: Props) {
  const isUser = message.role === 'user';
  const content = isStreaming ? streamContent || '' : message.content;
  const time = formatTime(message.createdAt);

  // Memoize rendered markdown to avoid re-rendering
  const renderedContent = useMemo(() => {
    if (isUser) return null;
    return renderMarkdown(content);
  }, [content, isUser]);

  // User messages - left-aligned style (same side as AI)
  if (isUser) {
    return (
      <Box flexDirection="column" marginY={1} paddingX={1}>
        <Box>
          <Text color="cyan" bold>● </Text>
          <Text color="cyan">You</Text>
          <Text dimColor> {time}</Text>
        </Box>
        <Box marginTop={1} paddingLeft={1}>
          <Box borderLeft borderLeftColor="cyan" borderLeftDimColor>
            <Box paddingLeft={1}>
              <Text wrap="wrap">{content}</Text>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // AI messages - clean left-aligned style
  const lines = renderedContent ? renderedContent.split('\n') : content.split('\n');
  const readTime = !isStreaming && content.length > 200 ? estimateReadTime(content) : null;

  return (
    <Box flexDirection="column" marginY={1} paddingX={1}>
      {/* Header with model name and metadata */}
      <Box>
        <Text color="green" bold>◆ </Text>
        <Text color="green">{modelName || 'AI'}</Text>
        <Text dimColor> {time}</Text>
        {readTime && <Text dimColor> · {readTime}</Text>}
        {isStreaming && <Text color="yellow"> ● generating...</Text>}
      </Box>

      {/* Message content with left border */}
      <Box marginTop={1} flexDirection="column" paddingLeft={1}>
        <Box borderLeft borderLeftColor="green" borderLeftDimColor>
          <Box flexDirection="column" paddingLeft={1}>
            {lines.map((line, i) => (
              <Text key={i} wrap="wrap">{line || ' '}</Text>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Streaming cursor */}
      {isStreaming && (
        <Box paddingLeft={2}>
          <Text color="green" bold>▊</Text>
        </Box>
      )}
    </Box>
  );
}
