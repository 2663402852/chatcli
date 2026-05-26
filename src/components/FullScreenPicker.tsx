import React, { useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Session, ModelConfig, Preset, SidebarView } from '../lib/types.js';

interface Props {
  view: SidebarView;
  sessions: Session[];
  models: ModelConfig[];
  presets: Preset[];
  activeSessionId: string | null;
  activeModelId: string | null;
  activePresetId: string | null;
  selectedIndex: number;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onSelectModel: (id: string) => void;
  onDeleteModel: (id: string) => void;
  onSelectPreset: (id: string) => void;
  onDeletePreset?: (id: string) => void;
  onEditModel: (model: ModelConfig) => void;
  onEditPreset?: (preset: Preset) => void;
  onSetIndex: (i: number) => void;
  onCreateSession: () => void;
  onCreateModel: () => void;
  onCreatePreset: () => void;
  onClose: () => void;
  searchResults?: (Session & { snippet: string })[];
  onSearch?: (q: string) => void;
}

// Icons for different views
const VIEW_ICONS: Record<SidebarView, string> = {
  sessions: '💬',
  models: '🤖',
  presets: '📋',
  search: '🔍',
};

const VIEW_TITLES: Record<SidebarView, string> = {
  sessions: 'Chat Sessions',
  models: 'Model Configuration',
  presets: 'System Presets',
  search: 'Search History',
};

export function FullScreenPicker({
  view, sessions, models, presets, activeSessionId, activeModelId, activePresetId,
  selectedIndex, onSelectSession, onDeleteSession, onSelectModel, onDeleteModel,
  onSelectPreset, onDeletePreset, onEditModel, onEditPreset, onSetIndex, onCreateSession, onCreateModel,
  onCreatePreset, onClose, searchResults, onSearch
}: Props) {
  const orderedModels = useMemo(() => {
    const current = models.find(m => m.id === activeModelId);
    const rest = models.filter(m => m.id !== activeModelId);
    return current ? [current, ...rest] : models;
  }, [models, activeModelId]);

  const orderedPresets = useMemo(() => {
    const current = presets.find(p => p.id === activePresetId);
    const rest = presets.filter(p => p.id !== activePresetId);
    return current ? [current, ...rest] : presets;
  }, [presets, activePresetId]);

  const getMaxIdx = () => {
    switch (view) {
      case 'sessions': return Math.max(0, sessions.length - 1);
      case 'models': return Math.max(0, orderedModels.length - 1);
      case 'presets': return Math.max(0, orderedPresets.length - 1);
      case 'search': return Math.max(0, (searchResults?.length || 1) - 1);
      default: return 0;
    }
  };

  useInput((inputChar, key) => {
    const maxIdx = getMaxIdx();

    if (key.escape || inputChar === 'q') {
      onClose();
      return;
    }

    if (key.upArrow) onSetIndex(Math.max(0, selectedIndex - 1));
    else if (key.downArrow) onSetIndex(Math.min(maxIdx, selectedIndex + 1));
    else if (key.return) {
      switch (view) {
        case 'sessions':
          if (sessions[selectedIndex]) onSelectSession(sessions[selectedIndex].id);
          break;
        case 'models':
          if (orderedModels[selectedIndex]) onSelectModel(orderedModels[selectedIndex].id);
          break;
        case 'presets':
          if (orderedPresets[selectedIndex]) onSelectPreset(orderedPresets[selectedIndex].id);
          break;
        case 'search':
          if (searchResults?.[selectedIndex]) onSelectSession(searchResults[selectedIndex].id);
          break;
      }
    } else if (inputChar === 'n' || inputChar === 'a') {
      if (view === 'sessions') onCreateSession();
      else if (view === 'models') onCreateModel();
      else if (view === 'presets') onCreatePreset();
    } else if (inputChar === 'd') {
      if (view === 'sessions' && sessions[selectedIndex]) onDeleteSession(sessions[selectedIndex].id);
      else if (view === 'models' && orderedModels[selectedIndex]) onDeleteModel(orderedModels[selectedIndex].id);
      else if (view === 'presets' && orderedPresets[selectedIndex]) onDeletePreset?.(orderedPresets[selectedIndex].id);
    } else if (inputChar === 'e') {
      if (view === 'models' && orderedModels[selectedIndex]) onEditModel(orderedModels[selectedIndex]);
      else if (view === 'presets' && orderedPresets[selectedIndex]) onEditPreset?.(orderedPresets[selectedIndex]);
    }
  });

  const renderList = () => {
    switch (view) {
      case 'sessions':
        return sessions.length === 0 ? (
          <Box flexDirection="column" alignItems="center" paddingY={4}>
            <Text dimColor>No chat sessions yet</Text>
            <Box marginTop={1}>
              <Text>Press <Text color="green" bold>n</Text> to create a new chat</Text>
            </Box>
          </Box>
        ) : sessions.map((s, i) => {
          const isSelected = i === selectedIndex;
          const isActive = s.id === activeSessionId;
          return (
            <Box key={s.id} paddingX={2} paddingY={0}>
              <Box
                borderStyle={isSelected ? 'round' : undefined}
                borderColor={isSelected ? 'green' : undefined}
                paddingX={isSelected ? 1 : 0}
                width="100%"
              >
                <Text color={isSelected ? 'green' : undefined} bold={isSelected}>
                  {isSelected ? '▸ ' : '  '}
                  {s.title.slice(0, 55)}
                  {isActive ? ' ◀' : ''}
                </Text>
              </Box>
            </Box>
          );
        });

      case 'models':
        return orderedModels.map((m, i) => {
          const isSelected = i === selectedIndex;
          const isActive = m.id === activeModelId;
          return (
            <Box key={m.id} paddingX={2} paddingY={0}>
              <Box
                borderStyle={isSelected ? 'round' : undefined}
                borderColor={isSelected ? 'green' : undefined}
                paddingX={isSelected ? 1 : 0}
                width="100%"
                justifyContent="space-between"
              >
                <Box>
                  <Text color={isSelected ? 'green' : undefined} bold={isSelected}>
                    {isSelected ? '▸ ' : '  '}
                    {m.name}
                  </Text>
                  <Text dimColor> ({m.modelName})</Text>
                </Box>
                {isActive && <Text color="cyan">● active</Text>}
              </Box>
            </Box>
          );
        });

      case 'presets':
        return orderedPresets.map((p, i) => {
          const isSelected = i === selectedIndex;
          const isActive = p.id === activePresetId;
          return (
            <Box key={p.id} paddingX={2} paddingY={0}>
              <Box
                borderStyle={isSelected ? 'round' : undefined}
                borderColor={isSelected ? 'green' : undefined}
                paddingX={isSelected ? 1 : 0}
                width="100%"
                justifyContent="space-between"
              >
                <Text color={isSelected ? 'green' : undefined} bold={isSelected}>
                  {isSelected ? '▸ ' : '  '}
                  {p.name}
                </Text>
                {isActive && <Text color="cyan">● active</Text>}
              </Box>
            </Box>
          );
        });

      case 'search':
        return (searchResults || []).length === 0 ? (
          <Box flexDirection="column" alignItems="center" paddingY={4}>
            <Text dimColor>No results found</Text>
          </Box>
        ) : (searchResults || []).map((s, i) => {
          const isSelected = i === selectedIndex;
          return (
            <Box key={s.id + '_' + i} paddingX={2} flexDirection="column" paddingY={0}>
              <Box
                borderStyle={isSelected ? 'round' : undefined}
                borderColor={isSelected ? 'green' : undefined}
                paddingX={isSelected ? 1 : 0}
                flexDirection="column"
              >
                <Text color={isSelected ? 'green' : undefined} bold={isSelected}>
                  {isSelected ? '▸ ' : '  '}
                  {s.title.slice(0, 55)}
                </Text>
                {s.snippet && (
                  <Text dimColor>    {s.snippet.slice(0, 65)}...</Text>
                )}
              </Box>
            </Box>
          );
        });
    }
  };

  // Get keyboard shortcuts based on view
  const getShortcuts = () => {
    const base = '↑↓ Navigate  Enter Select  Esc/q Close';
    switch (view) {
      case 'sessions': return `${base}  n New  d Delete`;
      case 'models': return `${base}  n New  e Edit  d Delete`;
      case 'presets': return `${base}  n New  e Edit  d Delete`;
      case 'search': return base;
      default: return base;
    }
  };

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <Box
        paddingX={2}
        paddingY={1}
        justifyContent="center"
        borderStyle="double"
        borderColor="green"
      >
        <Text color="green" bold>
          {VIEW_ICONS[view]} {VIEW_TITLES[view]}
        </Text>
      </Box>

      {/* Content area */}
      <Box flexDirection="column" paddingY={1} flexGrow={1} overflowY="hidden">
        {renderList()}
      </Box>

      {/* Footer with shortcuts */}
      <Box
        paddingX={2}
        paddingY={1}
        justifyContent="center"
        borderStyle="single"
        borderColor="gray"
        borderDimColor
      >
        <Text dimColor>{getShortcuts()}</Text>
      </Box>
    </Box>
  );
}
