import { useState, useCallback, useRef } from 'react';
import * as db from '../lib/db.js';
import { streamChat } from '../lib/api.js';
import type { Session, Message, ModelConfig, Preset, SidebarView } from '../lib/types.js';
import { generateId } from '../lib/terminal.js';

export function useChat() {
  const [sessions, setSessions] = useState<Session[]>(() => db.getSessions());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<ModelConfig[]>(() => db.getModels());
  const [presets, setPresets] = useState<Preset[]>(() => db.getPresets());
  const [activeModelId, setActiveModelId] = useState<string>(() => db.getConfig('activeModelId') || 'default');
  const [activePresetId, setActivePresetId] = useState<string>(() => db.getConfig('activePresetId') || 'default');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [sidebarView, setSidebarView] = useState<SidebarView>('sessions');
  const [sidebarIndex, setSidebarIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const streamingSessionRef = useRef<string | null>(null);

  const activeModel = models.find(m => m.id === activeModelId) || models[0];
  const activePreset = presets.find(p => p.id === activePresetId);
  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  const refreshSessions = useCallback(() => setSessions(db.getSessions()), []);

  const createNewSession = useCallback(() => {
    const s = db.createSession(undefined, activeModelId, activePresetId);
    setSessions(db.getSessions());
    setActiveSessionId(s.id);
    setMessages([]);
    return s;
  }, [activeModelId, activePresetId]);

  const selectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setMessages(db.getMessages(id));
  }, []);

  const deleteSessionById = useCallback((id: string) => {
    db.deleteSession(id);
    const updated = db.getSessions();
    setSessions(updated);
    if (activeSessionId === id) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
        setMessages(db.getMessages(updated[0].id));
      } else {
        setActiveSessionId(null);
        setMessages([]);
      }
    }
  }, [activeSessionId]);

  const clearSession = useCallback(() => {
    if (!activeSessionId) return;
    db.clearMessages(activeSessionId);
    setMessages([]);
    setSessions(db.getSessions());
  }, [activeSessionId]);

  const renameSession = useCallback((title: string) => {
    if (!activeSessionId) return;
    db.renameSession(activeSessionId, title);
    setSessions(db.getSessions());
  }, [activeSessionId]);

  const exportSession = useCallback((): string | null => {
    if (!activeSessionId) return null;
    const data = db.exportSession(activeSessionId);
    if (!data) return null;
    const lines = [`# ${data.session.title}`, `Exported: ${new Date().toISOString()}`, ''];
    for (const msg of data.messages) {
      const role = msg.role === 'user' ? '**You**' : '**AI**';
      lines.push(`## ${role} (${msg.createdAt})`);
      lines.push(msg.content);
      lines.push('');
    }
    return lines.join('\n');
  }, [activeSessionId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      const s = createNewSession();
      sessionId = s.id;
    }

    const userMsg = db.addMessage(sessionId, 'user', content);
    const systemContent = activePreset?.content || 'You are a helpful assistant.';
    const systemMsg = { role: 'system', content: systemContent };

    const history = db.getMessages(sessionId);
    const apiMessages = [systemMsg, ...history.map(m => ({ role: m.role, content: m.content }))];

    setMessages(prev => [...prev, userMsg]);

    // Auto-title from first user message
    if (history.length <= 1) {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      db.updateSessionTitle(sessionId, title);
      setSessions(db.getSessions());
    }

    setIsStreaming(true);
    setStreamContent('');
    setError(null);
    streamingSessionRef.current = sessionId;

    const controller = new AbortController();
    abortRef.current = controller;

    let acc = '';
    await streamChat(
      activeModel,
      apiMessages,
      controller.signal,
      {
        onToken(token) {
          acc += token;
          setStreamContent(acc);
        },
        onDone() {
          if (acc) {
            const msg = db.addMessage(streamingSessionRef.current!, 'assistant', acc);
            setMessages(msgs => [...msgs, msg]);
          }
          setStreamContent('');
          setIsStreaming(false);
          abortRef.current = null;
          streamingSessionRef.current = null;
        },
        onError(err) {
          // Save partial content on error too
          if (acc) {
            const msg = db.addMessage(streamingSessionRef.current!, 'assistant', acc);
            setMessages(msgs => [...msgs, msg]);
          }
          setStreamContent('');
          setError(err.message);
          setIsStreaming(false);
          abortRef.current = null;
          streamingSessionRef.current = null;
        },
      }
    );
  }, [activeSessionId, isStreaming, activeModel, activePreset, createNewSession]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // Model CRUD
  const saveModel = useCallback((m: ModelConfig) => {
    db.upsertModel(m);
    setModels(db.getModels());
  }, []);

  const removeModel = useCallback((id: string) => {
    db.deleteModel(id);
    const updated = db.getModels();
    setModels(updated);
    if (activeModelId === id) {
      const fallback = updated[0]?.id || 'default';
      setActiveModelId(fallback);
      db.setConfig('activeModelId', fallback);
    }
  }, [activeModelId]);

  const selectModel = useCallback((id: string) => {
    setActiveModelId(id);
    db.setConfig('activeModelId', id);
  }, []);

  // Preset CRUD
  const savePreset = useCallback((p: Preset) => {
    db.upsertPreset(p);
    setPresets(db.getPresets());
  }, []);

  const removePreset = useCallback((id: string) => {
    db.deletePreset(id);
    const updated = db.getPresets();
    setPresets(updated);
    if (activePresetId === id) {
      const fallback = updated[0]?.id || 'default';
      setActivePresetId(fallback);
      db.setConfig('activePresetId', fallback);
    }
  }, [activePresetId]);

  const selectPreset = useCallback((id: string) => {
    setActivePresetId(id);
    db.setConfig('activePresetId', id);
  }, []);

  return {
    sessions, activeSessionId, activeSession, messages, models, presets,
    activeModelId, activePresetId, activeModel, activePreset,
    isStreaming, streamContent, sidebarView, sidebarIndex, error,
    setSidebarView, setSidebarIndex, setError,
    createNewSession, selectSession, deleteSessionById,
    clearSession, renameSession, exportSession,
    sendMessage, stopStreaming,
    saveModel, removeModel, selectModel,
    savePreset, removePreset, selectPreset,
    refreshSessions,
  } as const;
}
