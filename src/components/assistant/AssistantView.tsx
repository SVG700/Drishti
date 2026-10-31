import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  BotMessageSquare,
  User,
  Sparkles,
  RotateCcw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiService from '../../services/apiService';
import type { AIAssistantResponse, AssistantClarificationOption } from '../../types/backend';
import type { InfrastructureProject } from '../../types/project';
import type { NavigationTab } from '../layout/AppShell';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  responseMeta?: AIAssistantResponse;
  isError?: boolean;
}

interface AssistantViewProps {
  projects: InfrastructureProject[];
  selectedProject: InfrastructureProject | null;
  onSelectProject: (project: InfrastructureProject) => void;
  onInspectProject?: (project: InfrastructureProject) => void;
  onNavigateTab: (tab: NavigationTab) => void;
  isBackendOnline: boolean;
}

export const AssistantView: React.FC<AssistantViewProps> = ({
  projects,
  selectedProject,
  onSelectProject,
  onInspectProject,
  onNavigateTab,
  isBackendOnline
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-msg',
      sender: 'assistant',
      text: "Hello! I'm DRISHTI AI, your assistant for MoSPI PAIMANA infrastructure project monitoring. Ask me about project progress, costs, delays, forecasts, or the available dataset.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => {
    return 'paimana-session-' + Math.random().toString(36).substring(2, 9);
  });
  const [targetProjectId, setTargetProjectId] = useState<string>(selectedProject?.id || '');
  const [expandedMetaIndex, setExpandedMetaIndex] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync selected project into target ID if changed from outside
  useEffect(() => {
    if (selectedProject?.id) {
      setTargetProjectId(selectedProject.id);
    }
  }, [selectedProject]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const exampleQuestions = [
    'Status and delay forecast for Project 400010',
    'Evaluate schedule risk and completion velocity for Leh Airport',
    'Key cost overruns and delays in Railways & Metro sector'
  ];

  const handleSend = async (queryToSend?: string) => {
    const query = (queryToSend || inputText).trim();
    if (!query || isLoading) return;

    const userMessage: Message = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    if (!queryToSend) setInputText('');
    setIsLoading(true);

    try {
      const response = await apiService.askAssistant({
        query,
        project_id: targetProjectId ? targetProjectId : undefined,
        include_analytical_context: true,
        session_id: sessionId,
        reset_session: false
      });

      if (response.session_id) {
        setSessionId(response.session_id);
      }

      // If response identifies a specific project, sync with selected
      if (response.project_id) {
        const found = projects.find(p => p.id === response.project_id);
        if (found) {
          onSelectProject(found);
          setTargetProjectId(found.id);
        }
      }

      const assistantMessage: Message = {
        id: 'msg-asst-' + Date.now(),
        sender: 'assistant',
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        responseMeta: response
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('AI Assistant API call failed:', err);
      const errorMessage: Message = {
        id: 'msg-err-' + Date.now(),
        sender: 'assistant',
        text: `Unable to connect to DRISHTI AI Assistant service (${err.message || 'Connection refused'}). Please verify the FastAPI backend is running at ${apiService.getBaseUrl()}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSession = async () => {
    try {
      if (sessionId) {
        await apiService.resetAssistantSession(sessionId).catch(() => {});
      }
    } catch {
      // ignore
    }
    const newSession = 'paimana-session-' + Math.random().toString(36).substring(2, 9);
    setSessionId(newSession);
    setMessages([
      {
        id: 'reset-msg-' + Date.now(),
        sender: 'assistant',
        text: 'Session context and conversation history have been cleared. How can I assist you with the MoSPI PAIMANA project database?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSelectClarification = (option: AssistantClarificationOption) => {
    setTargetProjectId(option.project_id);
    const found = projects.find(p => p.id === option.project_id);
    if (found) onSelectProject(found);
    handleSend(`Provide full progress and delay analysis for project ${option.project_id}`);
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto space-y-3 pb-4">
      {/* ASSISTANT HEADER */}
      <div className="bg-[#0C1017] p-3.5 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold shrink-0">
            <BotMessageSquare className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 uppercase tracking-tight">
              <span className="text-gradient-drishti">DRISHTI</span> AI Assistant
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">
              AI-Powered Infrastructure Intelligence • MoSPI PAIMANA
            </p>
          </div>
        </div>

        {/* Target Project Filter & Reset Controls */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-[#121722] px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[11px]">Context Project:</span>
            <select
              value={targetProjectId}
              onChange={e => {
                setTargetProjectId(e.target.value);
                const p = projects.find(x => x.id === e.target.value);
                if (p) onSelectProject(p);
              }}
              className="bg-transparent text-cyan-400 font-bold outline-none cursor-pointer max-w-[150px] truncate"
            >
              <option value="" className="bg-[#121722] text-slate-400">
                Auto-Detect from Query
              </option>
              {projects.slice(0, 50).map(p => (
                <option key={p.id} value={p.id} className="bg-[#121722] text-slate-200">
                  #{p.id} - {p.name.substring(0, 30)}...
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleResetSession}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1 cursor-pointer"
            title="Reset conversation context & clear history"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Reset Context</span>
          </button>
        </div>
      </div>

      {/* BACKEND STATUS NOTICE IF OFFLINE */}
      {!isBackendOnline && (
        <div className="bg-amber-950/40 border border-amber-800/80 p-3 rounded-lg flex items-center justify-between text-xs font-mono text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              AI Backend is currently offline. Start the FastAPI server using:{' '}
              <code className="bg-black/50 px-1.5 py-0.5 rounded text-amber-200">
                uvicorn app.main:app --port 8000
              </code>
            </span>
          </div>
          <button
            onClick={() => handleSend('health check')}
            className="px-2 py-0.5 bg-amber-900/60 hover:bg-amber-800 text-amber-200 rounded border border-amber-700"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* CHAT MESSAGES DISPLAY */}
      <div className="flex-1 min-h-[350px] bg-[#090C12] rounded-xl border border-slate-800/80 p-4 overflow-y-auto space-y-4">
        {messages.map(msg => {
          const isUser = msg.sender === 'user';
          const meta = msg.responseMeta;
          const isMetaExpanded = expandedMetaIndex === msg.id;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 14, x: isUser ? 18 : -18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-cyan-600 text-slate-950'
                    : msg.isError
                    ? 'bg-rose-950 border border-rose-800 text-rose-400'
                    : 'bg-purple-950 border border-purple-800 text-purple-400'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <BotMessageSquare className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div
                  className={`p-3.5 rounded-xl text-xs font-sans leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-cyan-500/20 text-slate-100 border border-cyan-500/40 rounded-tr-none'
                      : msg.isError
                      ? 'bg-rose-950/40 text-rose-200 border border-rose-800/60 rounded-tl-none font-mono'
                      : 'bg-[#0E1420] text-slate-200 border border-slate-800 rounded-tl-none'
                  }`}
                >
                  {msg.text}

                  {/* Clarification Options if ambiguous query */}
                  {meta?.clarification_options && meta.clarification_options.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5 font-mono">
                      <div className="text-[10px] text-amber-400 font-bold uppercase">
                        Multiple candidate undertakings match your query. Select one:
                      </div>
                      <div className="space-y-1">
                        {meta.clarification_options.map(opt => (
                          <div
                            key={opt.project_id}
                            onClick={() => handleSelectClarification(opt)}
                            className="p-1.5 bg-[#121722] hover:bg-slate-800 rounded border border-slate-700/80 cursor-pointer flex items-center justify-between text-[11px]"
                          >
                            <span className="font-bold text-cyan-400">
                              #{opt.project_id} {opt.project_name}
                            </span>
                            <span className="text-slate-400 text-[10px]">{opt.sector}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grounding Metadata Dropdown for Assistant Answers */}
                  {!isUser && meta && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[10.5px] font-mono">
                      <button
                        onClick={() => setExpandedMetaIndex(isMetaExpanded ? null : msg.id)}
                        className="flex items-center justify-between w-full text-slate-400 hover:text-cyan-300 transition cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>
                            Factual Grounding: {meta.sources_used.join(', ') || 'MoSPI Repository'}
                          </span>
                        </span>
                        {isMetaExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isMetaExpanded && (
                        <div className="mt-2.5 p-2.5 bg-[#080B10] rounded border border-slate-800 space-y-2 text-[10px]">
                          {meta.project_id && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Grounded Project ID:</span>
                              <span className="text-cyan-400 font-bold">#{meta.project_id}</span>
                            </div>
                          )}

                          {meta.latest_reported_month && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Official Report Month:</span>
                              <span className="text-slate-200">{meta.latest_reported_month}</span>
                            </div>
                          )}

                          {meta.official_data_used &&
                            Object.keys(meta.official_data_used).length > 0 && (
                              <div>
                                <span className="text-slate-400 block mb-0.5">
                                  Official Figures Referenced:
                                </span>
                                <div className="grid grid-cols-2 gap-1 text-[9.5px]">
                                  {Object.entries(meta.official_data_used).map(([k, v]) => (
                                    <div
                                      key={k}
                                      className="p-1 bg-slate-900 rounded border border-slate-800"
                                    >
                                      <span className="text-slate-400">{k}:</span>{' '}
                                      <span className="text-emerald-400 font-bold">
                                        {String(v)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          {meta.disclaimer && (
                            <div className="text-[9px] text-slate-400 italic pt-1 border-t border-slate-800/60">
                              {meta.disclaimer}
                            </div>
                          )}

                          {meta.project_id && (
                            <div className="pt-1.5 flex gap-2">
                              <button
                                onClick={() => {
                                  const p = projects.find(x => x.id === meta.project_id);
                                  if (p) {
                                    if (onInspectProject) {
                                      onInspectProject(p);
                                    } else {
                                      onSelectProject(p);
                                      onNavigateTab('gods-eye');
                                    }
                                  }
                                }}
                                className="px-2.5 py-1 bg-cyan-950/70 text-cyan-300 rounded border border-cyan-800 hover:bg-cyan-900 font-medium cursor-pointer transition"
                              >
                                Inspect on 3D Globe
                              </button>
                              <button
                                onClick={() => {
                                  const p = projects.find(x => x.id === meta.project_id);
                                  if (p) onSelectProject(p);
                                  onNavigateTab('analytics');
                                }}
                                className="px-2.5 py-1 bg-slate-800 text-slate-200 rounded border border-slate-700 hover:bg-slate-700 font-medium cursor-pointer transition"
                              >
                                View Analytics
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div
                  className={`text-[9.5px] font-mono text-slate-400 px-1 ${
                    isUser ? 'text-right' : ''
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Loading Spinner */}
        {isLoading && (
          <motion.div className="flex gap-3 max-w-lg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-800 text-purple-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 animate-spin text-purple-400" />
            </div>
            <div className="p-3 bg-[#0E1420] border border-slate-800 rounded-xl rounded-tl-none text-xs font-mono text-slate-400 flex items-center gap-2">
              <span className="flex items-end gap-1 h-3" aria-hidden="true">
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-gradient-to-t from-cyan-400 to-purple-400"
                    animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                  />
                ))}
              </span>
              <span>Querying MoSPI dataset and executing analytical modules...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* QUICK EXAMPLE QUESTIONS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-none">
        <span className="text-slate-400 text-[10px] shrink-0 uppercase">Suggestions:</span>
        {exampleQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="px-2.5 py-1 bg-[#0C1017] hover:bg-[#121722] text-slate-300 hover:text-cyan-300 rounded-lg border border-slate-800 shrink-0 text-left transition cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* INPUT BAR */}
      <div className="bg-[#0C1017] p-2 sm:p-2.5 rounded-xl border border-slate-800/80 shadow-md flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask about project delays, forecasts, cost overruns, or sectors..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSend();
          }}
          disabled={isLoading}
          className="flex-1 bg-transparent border-none outline-none px-2 text-xs sm:text-sm text-slate-100 placeholder-slate-400"
        />

        <button
          onClick={() => handleSend()}
          disabled={!inputText.trim() || isLoading}
          className="p-2 sm:px-3 sm:py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed text-xs font-mono"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
      </div>
    </div>
  );
};

export default AssistantView;
