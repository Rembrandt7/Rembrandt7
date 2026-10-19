import React, { useState, useRef, useEffect } from 'react';
import { getGeminiClient } from '../../services/geminiService';
import { Bot, Send, X, Loader2, User, Sparkles } from 'lucide-react';
import { ChatMessage } from './types';

interface AiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hola. **Dime en qué vas a trabajar hoy** y te propondré roles expertos que puedo adoptar para ayudarte mejor.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const chatSessionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initializeChat = async () => {
    if (!chatSessionRef.current) {
      try {
        const ai = getGeminiClient();
        chatSessionRef.current = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: `Eres un asistente de productividad y experto en gestión de conocimientos de alto nivel.
            Tu objetivo principal es adaptarte al contexto del usuario mediante "Roles".
            
            IMPORTANTE: Tu formato de respuesta debe ser muy visual y legible.
            - Usa **negritas** para conceptos clave.
            - Usa listas con guiones para enumerar opciones.
            - Separa bien los párrafos.
            - Usa un tono profesional pero cercano.

            Cuando el usuario te diga qué va a hacer:
            1. Analiza la tarea.
            2. Propón 3 ROLES específicos.
            3. Pregúntale cuál prefiere.`,
          },
        });
      } catch (error) {
        console.error("Error initializing AI:", error);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      initializeChat();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      if (!chatSessionRef.current) await initializeChat();
      
      const result = await chatSessionRef.current.sendMessage({ message: userMsg });
      const responseText = result.text || '';

      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Lo siento, hubo un error al conectar con mis circuitos neuronales. Por favor intenta de nuevo." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <div key={i} className={`mb-1 ${line.trim().startsWith('-') ? 'pl-4' : ''}`}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <span key={j} className="font-bold text-brand-700">{part.slice(2, -2)}</span>;
            }
            return <span key={j}>{part}</span>;
          })}
        </div>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 w-96 max-h-[600px] h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 font-sans">
      {/* Header */}
      <div className="bg-slate-900 p-4 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
             <Sparkles className="w-5 h-5 text-yellow-300" />
          </div>
          <div>
            <span className="font-bold block text-sm">Asistente Experto</span>
            <span className="text-xs text-slate-400 block">Gemini 2.5 Powered</span>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 hover:bg-slate-700 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'model' ? 'bg-white border border-slate-100' : 'bg-slate-900'}`}>
              {msg.role === 'model' ? <Bot className="w-5 h-5 text-brand-600" /> : <User className="w-5 h-5 text-white" />}
            </div>
            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
              msg.role === 'model' 
                ? 'bg-white text-slate-700 rounded-tl-none border border-slate-100' 
                : 'bg-slate-900 text-white rounded-tr-none'
            }`}>
              {msg.role === 'model' ? renderFormattedText(msg.text) : msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white border border-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-brand-600" />
            </div>
            <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100">
              <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-slate-100 shrink-0">
        <div className="flex items-center gap-2 bg-slate-50 rounded-full px-4 py-2 border border-slate-200 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ej: Voy a estudiar física..." 
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-700 placeholder-slate-400"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-slate-900 text-white rounded-full hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiAssistant;
