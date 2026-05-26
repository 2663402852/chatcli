import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../lib/types.js';
import { MessageItem } from './MessageItem.js';

interface Props {
  messages: Message[];
  isStreaming: boolean;
  streamContent: string;
  sessionTitle: string | null;
  modelName?: string;
  activePresetName?: string;
}

// Minimal spinner frames
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

// Thinking messages - short and clean
const THINKING_MESSAGES = [
  'Thinking...',
  'Processing...',
  'Analyzing...',
  'Computing...',
  'Reasoning...',
  'Working...',
];

export function ChatView({ messages, isStreaming, streamContent, sessionTitle, modelName, activePresetName }: Props) {
  const startTimeRef = useRef(Date.now());
  const [spinnerIdx, setSpinnerIdx] = useState(0);
  const [thinkMsg] = useState(() => THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)]);
  const [elapsed, setElapsed] = useState(0);

  // Reset timer when streaming starts
  useEffect(() => {
    if (isStreaming && !streamContent) {
      startTimeRef.current = Date.now();
      setElapsed(0);
    }
  }, [isStreaming, streamContent]);

  // Animate spinner
  useEffect(() => {
    if (!isStreaming || streamContent) return;
    const timer = setInterval(() => {
      setSpinnerIdx(i => (i + 1) % SPINNER_FRAMES.length);
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 100);
    return () => clearInterval(timer);
  }, [isStreaming, streamContent]);

  const isThinking = isStreaming && !streamContent;

  // Build message list
  const messageElements = useMemo(() => (
    messages.map(msg => (
      <MessageItem key={msg.id} message={msg} modelName={modelName} />
    ))
  ), [messages, modelName]);

  // Welcome screen for empty chat
  if (messages.length === 0 && !isStreaming) {
    return (
      <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
        <Box flexDirection="column" alignItems="center">

          {/* ASCII Art Logo */}
          <Text color="#FFD700" bold>
            {" ██████╗██╗  ██╗ █████╗ ████████╗ ██████╗██╗     ██╗"}
          </Text>
          <Text color="#FFD700" bold>
            {"██╔════╝██║  ██║██╔══██╗╚══██╔══╝██╔════╝██║     ██║"}
          </Text>
          <Text color="#FFBF00" bold>
            {"██║     ███████║███████║   ██║   ██║     ██║     ██║"}
          </Text>
          <Text color="#FFBF00" bold>
            {"██║     ██╔══██║██╔══██║   ██║   ██║     ██║     ██║"}
          </Text>
          <Text color="#CD7F32" bold>
            {"╚██████╗██║  ██║██║  ██║   ██║   ╚██████╗███████╗██║"}
          </Text>
          <Text color="#CD7F32" bold>
            {" ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝╚══════╝╚═╝"}
          </Text>

          {/* Version info */}
          <Box marginTop={1}>
            <Text color="#FFD700" bold>{"ChatCLI v0.1.1"}</Text>
            <Text dimColor>{" · "}</Text>
            <Text dimColor>{"Terminal AI Chat Client"}</Text>
          </Box>

          {/* Status line */}
          <Box marginTop={1}>
            <Text dimColor>{modelName || "No Model"}</Text>
            <Text dimColor>{" · "}</Text>
            <Text dimColor>{activePresetName || "No Preset"}</Text>
          </Box>

          {/* Config hint */}
          <Box marginTop={1}>
            <Text color="#FFBF00">{"⚡ "}</Text>
            <Text>{"Run "}</Text>
            <Text color="#FFBF00" bold>{"/m"}</Text>
            <Text dimColor>{" to configure a model"}</Text>
          </Box>

          {/* Quick commands */}
          <Box marginTop={1} gap={3}>
            <Text><Text color="#FFBF00" bold>/new</Text><Text dimColor>{" New chat"}</Text></Text>
            <Text><Text color="#FFBF00" bold>/m</Text><Text dimColor>{" Models"}</Text></Text>
            <Text><Text color="#FFBF00" bold>/p</Text><Text dimColor>{" Presets"}</Text></Text>
            <Text><Text color="#FFBF00" bold>/help</Text><Text dimColor>{" All commands"}</Text></Text>
          </Box>

          {/* Bottom decorative line */}
          <Box marginTop={1}>
            <Text color="#CD7F32">
              {"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"}
            </Text>
          </Box>

        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1} overflowY="hidden">
      {/* Status bar */}
      <Box
        paddingX={1}
        paddingY={0}
        justifyContent="space-between"
        borderStyle="single"
        borderBottom
        borderTop={false}
        borderLeft={false}
        borderRight={false}
        borderColor="gray"
        borderDimColor
        flexShrink={0}
      >
        <Box>
          <Text color="green" bold>◆ </Text>
          <Text bold>{sessionTitle || 'New Chat'}</Text>
        </Box>
        <Box gap={2}>
          {modelName && <Text dimColor>{modelName}</Text>}
          {activePresetName && <Text dimColor>· {activePresetName}</Text>}
          <Text dimColor>{messages.length} msgs</Text>
          {isStreaming && <Text color="yellow"> ● </Text>}
        </Box>
      </Box>

      {/* Messages area - takes remaining space, scrolls */}
      <Box flexDirection="column" flexGrow={1} paddingY={1}>
        {messageElements}

        {/* Thinking indicator */}
        {isThinking && (
          <Box paddingX={2} paddingY={1}>
            <Text color="yellow">
              {SPINNER_FRAMES[spinnerIdx]} {thinkMsg} ({elapsed}s)
            </Text>
          </Box>
        )}

        {/* Streaming content */}
        {streamContent && (
          <MessageItem
            key="__streaming__"
            message={{ id: '__streaming__', sessionId: '', role: 'assistant', content: '', createdAt: '' }}
            modelName={modelName}
            isStreaming
            streamContent={streamContent}
          />
        )}
      </Box>
    </Box>
  );
}
