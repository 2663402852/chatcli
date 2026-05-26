import React, { useState, useCallback, useMemo } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { writeFileSync } from 'fs';
import { FullScreenPicker } from './components/FullScreenPicker.js';
import { ChatView } from './components/ChatView.js';
import { InputBox } from './components/InputBox.js';
import { useChat } from './hooks/useChat.js';
import * as db from './lib/db.js';
import type { ModelConfig, Preset, SidebarView } from './lib/types.js';
import { COMMANDS } from './lib/types.js';

type ConfirmAction = { type: 'deleteSession'; id: string; name: string } | { type: 'clearSession' };
type WizardMode = {
  type: 'model' | 'preset';
  step: number;
  data: Record<string, string>;
  editId?: string;
};

const MODEL_STEPS = [
  { key: 'name', label: 'Model Name', hint: 'e.g., GPT-4, Claude-3', required: true },
  { key: 'endpoint', label: 'API Endpoint', hint: 'https://api.openai.com/v1', required: true },
  { key: 'apiKey', label: 'API Key', hint: 'sk-...', required: true },
  { key: 'modelName', label: 'Model ID', hint: 'gpt-4, claude-3-opus', required: true },
];

const PRESET_STEPS = [
  { key: 'name', label: 'Preset Name', hint: 'e.g., Code Assistant, Translator', required: true },
  { key: 'content', label: 'System Prompt', hint: 'You are a helpful assistant...', required: true },
];

export default function App() {
  const { exit } = useApp();
  const chat = useChat();
  const [input, setInput] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchResults, setSearchResults] = useState<import('./lib/types.js').SessionWithSnippet[]>([]);
  const [confirming, setConfirming] = useState<ConfirmAction | null>(null);
  const [commandHint, setCommandHint] = useState('');
  const [wizard, setWizard] = useState<WizardMode | null>(null);
  const [lastCtrlCTime, setLastCtrlCTime] = useState(0);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [savedInput, setSavedInput] = useState('');

  const commandSuggestions = useMemo(() => {
    if (!input.startsWith('/')) return [];
    const query = input.toLowerCase();
    return COMMANDS.filter(cmd =>
      cmd.name.startsWith(query) ||
      cmd.alias?.some(a => a.startsWith(query))
    ).slice(0, 5);
  }, [input]);

  const handleSearch = useCallback((q: string) => {
    setSearchResults(q.trim() ? db.searchSessions(q) : []);
  }, []);

  const handleDeleteRequest = useCallback((id: string) => {
    const session = chat.sessions.find(s => s.id === id);
    if (session) setConfirming({ type: 'deleteSession', id, name: session.title });
  }, [chat.sessions]);

  const confirmDelete = useCallback(() => {
    if (confirming && confirming.type === 'deleteSession') {
      chat.deleteSessionById(confirming.id);
      setConfirming(null);
    }
  }, [confirming, chat]);

  const startWizard = useCallback((type: 'model' | 'preset', editModel?: ModelConfig, editPreset?: Preset) => {
    if (type === 'model' && editModel) {
      setWizard({
        type: 'model',
        step: 0,
        data: {
          name: editModel.name,
          endpoint: editModel.endpoint,
          apiKey: editModel.apiKey,
          modelName: editModel.modelName,
          maxTokens: String(editModel.maxTokens ?? 4096),
          temperature: String(editModel.temperature ?? 0.7),
        },
        editId: editModel.id,
      });
      setInput(editModel.name);
    } else if (type === 'preset' && editPreset) {
      setWizard({
        type: 'preset',
        step: 0,
        data: {
          name: editPreset.name,
          content: editPreset.content,
        },
        editId: editPreset.id,
      });
      setInput(editPreset.name);
    } else {
      setWizard({ type, step: 0, data: {} });
      setInput('');
    }
    setPickerVisible(false);
    setCommandHint('');
  }, []);

  const processWizard = useCallback((value: string) => {
    if (!wizard) return;

    const steps = wizard.type === 'model' ? MODEL_STEPS : PRESET_STEPS;
    const currentStep = steps[wizard.step];
    const val = value.trim();

    if (currentStep.required && !val) {
      setCommandHint(`${currentStep.label} is required`);
      return;
    }

    const newData = { ...wizard.data, [currentStep.key]: val || '' };
    const nextStep = wizard.step + 1;

    if (nextStep >= steps.length) {
      if (wizard.type === 'model') {
        const id = wizard.editId || 'model_' + Date.now().toString(36);
        const maxTokens = parseInt(newData.maxTokens) || 4096;
        const temperature = parseFloat(newData.temperature) || 0.7;
        const model: ModelConfig = {
          id,
          name: newData.name || 'New Model',
          endpoint: newData.endpoint || 'https://api.openai.com/v1',
          apiKey: newData.apiKey || '',
          modelName: newData.modelName || 'gpt-4',
          maxTokens: Math.max(1, Math.min(maxTokens, 128000)),
          temperature: Math.max(0, Math.min(temperature, 2)),
        };
        chat.saveModel(model);
        chat.selectModel(id);
        setCommandHint(`Model "${model.name}" saved`);
      } else {
        // Create a proper Preset (not a Model!)
        const id = wizard.editId || 'preset_' + Date.now().toString(36);
        const preset: Preset = {
          id,
          name: newData.name || 'Custom Preset',
          content: newData.content || 'You are a helpful assistant.',
        };
        chat.savePreset(preset);
        chat.selectPreset(id);
        setCommandHint(`Preset "${preset.name}" saved`);
      }
      setWizard(null);
      setPickerVisible(false);
    } else {
      setWizard({ ...wizard, step: nextStep, data: newData });
      // Pre-fill with existing value if editing (but not for API key)
      const nextStepDef = steps[nextStep];
      const prefill = newData[nextStepDef.key] || '';
      setInput(nextStepDef.key === 'apiKey' ? '' : prefill);
    }
  }, [wizard, chat]);

  const executeCommand = useCallback((raw: string) => {
    const parts = raw.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case '/new':
      case '/n':
        chat.createNewSession();
        setCommandHint('New session created');
        break;

      case '/sessions':
      case '/s':
      case '/history':
        setPickerVisible(true);
        chat.setSidebarView('sessions');
        chat.setSidebarIndex(0);
        setCommandHint('');
        break;

      case '/models':
      case '/m':
        setPickerVisible(true);
        chat.setSidebarView('models');
        chat.setSidebarIndex(0);
        setCommandHint('');
        break;

      case '/presets':
      case '/p':
        setPickerVisible(true);
        chat.setSidebarView('presets');
        chat.setSidebarIndex(0);
        setCommandHint('');
        break;

      case '/config':
      case '/c':
        if (args[0] === 'model') startWizard('model');
        else if (args[0] === 'preset') startWizard('preset');
        else setCommandHint('Usage: /config model | /config preset');
        break;

      case '/search':
        if (args.length > 0) {
          handleSearch(args.join(' '));
          setPickerVisible(true);
          chat.setSidebarView('search');
          chat.setSidebarIndex(0);
        } else {
          setCommandHint('Usage: /search <query>');
        }
        break;

      case '/use':
        if (args.length >= 2) {
          const type = args[0].toLowerCase();
          const name = args.slice(1).join(' ');
          if (type === 'model') {
            const model = chat.models.find(m =>
              m.modelName.toLowerCase().includes(name.toLowerCase()) ||
              m.name.toLowerCase().includes(name.toLowerCase())
            );
            if (model) {
              chat.selectModel(model.id);
              setCommandHint(`Switched to: ${model.modelName}`);
            } else {
              setCommandHint(`Model "${name}" not found`);
            }
          } else if (type === 'preset') {
            const preset = chat.presets.find(p => p.name.toLowerCase().includes(name.toLowerCase()));
            if (preset) {
              chat.selectPreset(preset.id);
              setCommandHint(`Switched to preset: ${preset.name}`);
            } else {
              setCommandHint(`Preset "${name}" not found`);
            }
          }
        } else {
          setCommandHint('Usage: /use model <name> | /use preset <name>');
        }
        break;

      case '/rename':
      case '/r':
        if (args.length > 0) {
          chat.renameSession(args.join(' '));
          setCommandHint('Session renamed');
        } else {
          setCommandHint('Usage: /rename <title>');
        }
        break;

      case '/clear':
        if (chat.activeSessionId) {
          if (chat.messages.length === 0) {
            setCommandHint('Session is already empty');
          } else {
            setConfirming({ type: 'clearSession' });
          }
        } else {
          setCommandHint('No active session');
        }
        break;

      case '/export':
        if (chat.activeSessionId) {
          const content = chat.exportSession();
          if (content) {
            const filename = `chat-export-${Date.now().toString(36)}.md`;
            writeFileSync(filename, content);
            setCommandHint(`Exported to ${filename}`);
          } else {
            setCommandHint('Export failed');
          }
        } else {
          setCommandHint('No active session');
        }
        break;

      case '/delete':
      case '/d':
      case '/del':
        if (chat.activeSessionId) handleDeleteRequest(chat.activeSessionId);
        else setCommandHint('No active session');
        break;

      case '/help':
      case '/h':
      case '/?':
        setPickerVisible(false);
        setCommandHint('HELP');
        break;

      case '/quit':
      case '/q':
      case '/exit':
        exit();
        break;

      default:
        setCommandHint(`Unknown: ${cmd}. Type /help`);
    }
  }, [chat, handleSearch, handleDeleteRequest, exit, startWizard]);

  useInput((inputChar, key) => {
    // Wizard cancel
    if (wizard && key.escape) {
      setWizard(null);
      setCommandHint('Cancelled');
      return;
    }

    // Confirmation dialog
    if (confirming) {
      if (inputChar === 'y') {
        if (confirming.type === 'clearSession') {
          chat.clearSession();
          setCommandHint('Session cleared');
          setConfirming(null);
        } else {
          confirmDelete();
        }
        return;
      }
      if (inputChar === 'n' || key.escape) { setConfirming(null); return; }
      return;
    }

    // Ctrl+C - Claude style interrupt/exit
    if (key.ctrl && inputChar === 'c') {
      if (chat.isStreaming) {
        chat.stopStreaming();
        setCommandHint('Stopped');
        return;
      }
      if (wizard) {
        setWizard(null);
        setCommandHint('Cancelled');
        return;
      }
      const now = Date.now();
      if (now - lastCtrlCTime < 2000) {
        exit();
        return;
      }
      setLastCtrlCTime(now);
      setCommandHint('Press Ctrl+C again to exit, or use /quit');
      return;
    }

    // Ctrl+D - immediate exit
    if (key.ctrl && inputChar === 'd') {
      exit();
      return;
    }

    // Ctrl+L - clear screen / new session
    if (key.ctrl && inputChar === 'l') {
      chat.createNewSession();
      setCommandHint('New session');
      return;
    }

    // Up/Down arrow - input history navigation
    if (key.upArrow && !pickerVisible && !wizard) {
      if (inputHistory.length === 0) return;
      const newIdx = historyIdx === -1 ? inputHistory.length - 1 : Math.max(0, historyIdx - 1);
      if (historyIdx === -1) setSavedInput(input);
      setHistoryIdx(newIdx);
      setInput(inputHistory[newIdx]);
      return;
    }
    if (key.downArrow && !pickerVisible && !wizard) {
      if (historyIdx === -1) return;
      const newIdx = historyIdx + 1;
      if (newIdx >= inputHistory.length) {
        setHistoryIdx(-1);
        setInput(savedInput);
      } else {
        setHistoryIdx(newIdx);
        setInput(inputHistory[newIdx]);
      }
      return;
    }

    // Escape - clear/close
    if (key.escape) {
      if (pickerVisible) {
        setPickerVisible(false);
      }
      if (input) {
        setInput('');
        setHistoryIdx(-1);
      }
      setCommandHint('');
      return;
    }

    // Clear hint on any other key
    if (commandHint && !key.ctrl && !key.meta) {
      setCommandHint('');
    }
  });

  const steps = wizard?.type === 'model' ? MODEL_STEPS : PRESET_STEPS;
  const currentStep = wizard ? steps[wizard.step] : null;

  // Full-screen picker mode
  if (pickerVisible) {
    return (
      <FullScreenPicker
        view={chat.sidebarView}
        sessions={chat.sessions}
        models={chat.models}
        presets={chat.presets}
        activeSessionId={chat.activeSessionId}
        activeModelId={chat.activeModelId}
        activePresetId={chat.activePresetId}
        selectedIndex={chat.sidebarIndex}
        onSelectSession={(id) => { chat.selectSession(id); setPickerVisible(false); }}
        onDeleteSession={handleDeleteRequest}
        onSelectModel={(id) => {
          chat.selectModel(id);
          const m = chat.models.find(x => x.id === id);
          setCommandHint(`Switched to: ${m?.modelName || id}`);
          setPickerVisible(false);
        }}
        onDeleteModel={(id) => {
          chat.removeModel(id);
          setCommandHint('Model deleted');
        }}
        onSelectPreset={(id) => {
          chat.selectPreset(id);
          const p = chat.presets.find(x => x.id === id);
          setCommandHint(`Switched to: ${p?.name || id}`);
          setPickerVisible(false);
        }}
        onDeletePreset={(id) => {
          chat.removePreset(id);
          setCommandHint('Preset deleted');
        }}
        onEditModel={(m) => startWizard('model', m)}
        onEditPreset={(p) => startWizard('preset', undefined, p)}
        onSetIndex={chat.setSidebarIndex}
        onCreateSession={chat.createNewSession}
        onCreateModel={() => startWizard('model')}
        onCreatePreset={() => startWizard('preset')}
        onClose={() => setPickerVisible(false)}
        searchResults={searchResults}
        onSearch={handleSearch}
      />
    );
  }

  // Normal chat mode
  return (
    <Box flexDirection="column" height="100%">
      {/* Top bar */}
      <Box
        paddingX={1}
        justifyContent="space-between"
        borderStyle="single"
        borderBottom
        borderTop={false}
        borderLeft={false}
        borderRight={false}
        borderColor="gray"
        borderDimColor
      >
        <Box gap={1}>
          <Text color="cyan" bold>⚡</Text>
          <Text bold>ChatCLI</Text>
        </Box>
        <Box gap={1}>
          <Text dimColor>{chat.activeModel?.modelName || 'No Model'}</Text>
          <Text dimColor>·</Text>
          <Text dimColor>{chat.activePreset?.name || 'No Preset'}</Text>
        </Box>
      </Box>

      {/* Chat */}
      <Box flexDirection="column" flexGrow={1}>
        <ChatView
          messages={chat.messages}
          isStreaming={chat.isStreaming}
          streamContent={chat.streamContent}
          sessionTitle={chat.activeSession?.title || null}
          modelName={chat.activeModel?.modelName}
          activePresetName={chat.activePreset?.name}
        />
      </Box>

      {/* Command suggestions */}
      {commandSuggestions.length > 0 && !wizard && (
        <Box paddingX={2} flexDirection="column">
          {commandSuggestions.map(cmd => (
            <Box key={cmd.name} gap={1}>
              <Text color="green" bold>{cmd.name}</Text>
              {cmd.alias && <Text dimColor>({cmd.alias.join(',')})</Text>}
              <Text dimColor>{cmd.description}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Error display */}
      {chat.error && !wizard && (
        <Box paddingX={2} paddingY={0}>
          <Text color="red">✖ {chat.error}</Text>
        </Box>
      )}

      {/* Command hint */}
      {commandHint && commandHint !== 'HELP' && !wizard && (
        <Box paddingX={2}>
          <Text color="yellow">⚡ {commandHint}</Text>
        </Box>
      )}

      {/* Help panel */}
      {commandHint === 'HELP' && !wizard && (
        <Box paddingX={2} paddingY={1} flexDirection="column" borderStyle="round" borderColor="cyan">
          <Text color="cyan" bold>📖 Available Commands</Text>
          <Box marginTop={1} flexDirection="column">
            {COMMANDS.map(cmd => (
              <Box key={cmd.name} gap={1}>
                <Text color="green" bold>{cmd.name.padEnd(12)}</Text>
                {cmd.alias && <Text dimColor>({cmd.alias.join(', ')})</Text>}
                <Text dimColor>{cmd.description}</Text>
                {cmd.usage && <Text dimColor> — {cmd.usage}</Text>}
              </Box>
            ))}
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Shortcuts: ↑↓ history · Ctrl+C stop/exit · Ctrl+D exit · Ctrl+L new chat</Text>
          </Box>
        </Box>
      )}

      {/* Confirmation */}
      {confirming && (
        <Box paddingX={2} paddingY={1} borderStyle="round" borderColor="red">
          <Text color="red" bold>⚠ </Text>
          {confirming.type === 'clearSession' ? (
            <Text>Clear all messages in this session? </Text>
          ) : (
            <Text>Delete "{confirming.name}"? </Text>
          )}
          <Text color="green" bold>[Y]</Text>
          <Text>es / </Text>
          <Text color="red" bold>[N]</Text>
          <Text>o</Text>
        </Box>
      )}

      {/* Wizard */}
      {wizard && currentStep && (
        <Box paddingX={2} paddingY={1} flexDirection="column" borderStyle="round" borderColor="cyan">
          <Box justifyContent="space-between">
            <Text color="cyan" bold>
              ✎ {wizard.type === 'model' ? (wizard.editId ? 'Edit Model' : 'New Model') : (wizard.editId ? 'Edit Preset' : 'New Preset')}
            </Text>
            <Text dimColor>Step {wizard.step + 1}/{steps.length}</Text>
          </Box>
          <Box marginTop={1}>
            <Text>
              <Text color="green" bold>{currentStep.label}: </Text>
              <Text dimColor>{currentStep.hint}</Text>
            </Text>
          </Box>
          {wizard.step > 0 && (
            <Box marginTop={1} flexDirection="column">
              {steps.slice(0, wizard.step).map((s) => (
                <Text key={s.key} dimColor>
                  <Text color="green">✓</Text> {s.label}: {s.key === 'apiKey' && wizard.data[s.key] ? '••••••••' : wizard.data[s.key] || '(empty)'}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Input */}
      <Box paddingBottom={1}>
        <InputBox
          value={input}
          onChange={(val) => { setInput(val); setCommandHint(''); setHistoryIdx(-1); }}
          onSubmit={(val) => {
            if (wizard) {
              processWizard(val);
            } else if (val.startsWith('/')) {
              executeCommand(val);
              setInput('');
            } else if (val.trim()) {
              setInputHistory(prev => [...prev.slice(-50), val]);
              chat.sendMessage(val);
              setInput('');
            }
            setHistoryIdx(-1);
          }}
          isStreaming={chat.isStreaming}
          focused={wizard ? true : confirming ? false : true}
          placeholder={wizard ? `${currentStep?.label}: ${currentStep?.hint}` : 'Type a message or / for commands...'}
        />
      </Box>
    </Box>
  );
}
