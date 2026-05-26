import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { getTerminalWidth } from '../lib/terminal.js';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (val: string) => void;
  isStreaming: boolean;
  focused: boolean;
  placeholder?: string;
}

// Command hints with descriptions
const COMMAND_HINTS: Record<string, string> = {
  '/new': 'Create new chat',
  '/sessions': 'View chat history',
  '/models': 'Switch model',
  '/presets': 'Switch preset',
  '/config': 'Configure model/preset',
  '/search': 'Search history',
  '/use': 'Quick switch model/preset',
  '/delete': 'Delete current chat',
  '/help': 'Show all commands',
  '/quit': 'Exit application',
};

export function InputBox({ value, onChange, onSubmit, isStreaming, focused, placeholder }: Props) {
  const isCommand = value.startsWith('/');
  const [termWidth, setTermWidth] = useState(getTerminalWidth());

  useEffect(() => {
    const handleResize = () => setTermWidth(getTerminalWidth());
    process.stdout.on?.('resize', handleResize);
    return () => { process.stdout.off?.('resize', handleResize); };
  }, []);

  // Find matching command hints
  const matchingHints = useMemo(() => {
    if (!isCommand || value.length < 2) return [];
    const query = value.toLowerCase();
    return Object.entries(COMMAND_HINTS)
      .filter(([cmd]) => cmd.startsWith(query))
      .slice(0, 3);
  }, [value, isCommand]);

  return (
    <Box flexDirection="column">
      {/* Input area with border */}
      <Box
        paddingX={1}
        paddingY={0}
        borderStyle="single"
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
        borderColor={isCommand ? 'green' : 'gray'}
        borderDimColor={!isCommand}
      >
        <Box width="100%">
          <Text color={isCommand ? 'green' : 'cyan'} bold>
            {isCommand ? '❯ ' : '› '}
          </Text>
          {isStreaming ? (
            <Box>
              <Text color="yellow" dimColor>Generating... </Text>
              <Text color="yellow" bold>Ctrl+C</Text>
              <Text dimColor> to stop</Text>
            </Box>
          ) : (
            <TextInput
              value={value}
              onChange={onChange}
              onSubmit={() => { if (value.trim()) onSubmit(value); }}
              focus={focused}
              placeholder={placeholder || 'Type a message or / for commands...'}
            />
          )}
        </Box>
      </Box>

      {/* Command suggestions */}
      {focused && !isStreaming && matchingHints.length > 0 && (
        <Box paddingX={2} paddingY={0} flexDirection="column">
          {matchingHints.map(([cmd, hint]) => (
            <Box key={cmd} gap={1}>
              <Text color="green" bold>{cmd}</Text>
              <Text dimColor>{hint}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Keyboard shortcuts hint - only show when empty */}
      {focused && !value && !isStreaming && (
        <Box paddingX={2} paddingY={0}>
          <Text dimColor>
            <Text color="gray">↑↓</Text> history · <Text color="gray">Tab</Text> sidebar · <Text color="gray">Ctrl+C</Text> exit
          </Text>
        </Box>
      )}
    </Box>
  );
}
