import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useLinks } from '../contexts/LinkContext';

interface LiveAssistantProps {
  onClose?: () => void;
}

const LiveAssistant: React.FC<LiveAssistantProps> = ({ onClose }) => {
  const { config, googleApiConfig } = useLinks();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const sessionRef = useRef<any>(null);
  const audioInputContextRef = useRef<AudioContext | null>(null);
  const audioOutputContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  const startLive = async () => {
    setIsConnecting(true);
    try {
      const apiKey = googleApiConfig?.apiKey || process.env.GEMINI_API_KEY || '';
      const ai = new GoogleGenAI({ 
        apiKey: googleApiConfig?.apiKey || process.env.GEMINI_API_KEY || '',
        baseUrl: `${window.location.origin}/api/proxy/google`
      });
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioOutputContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      nextPlayTimeRef.current = audioOutputContextRef.current.currentTime;

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        callbacks: {
          onopen: async () => {
            setIsConnected(true);
            setIsConnecting(false);
            
            // Start recording
            audioInputContextRef.current = new AudioContextClass({ sampleRate: 16000 });
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = audioInputContextRef.current.createMediaStreamSource(streamRef.current);
            processorRef.current = audioInputContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processorRef.current.onaudioprocess = (e) => {
              const channelData = e.inputBuffer.getChannelData(0);
              const pcm16 = new Int16Array(channelData.length);
              for (let i = 0; i < channelData.length; i++) {
                pcm16[i] = Math.max(-32768, Math.min(32767, channelData[i] * 32768));
              }
              const buffer = new ArrayBuffer(pcm16.length * 2);
              const view = new DataView(buffer);
              for (let i = 0; i < pcm16.length; i++) {
                view.setInt16(i * 2, pcm16[i], true);
              }
              
              let binary = '';
              const bytes = new Uint8Array(buffer);
              for (let i = 0; i < bytes.byteLength; i++) {
                  binary += String.fromCharCode(bytes[i]);
              }
              const base64 = btoa(binary);
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ audio: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
              });
            };
            
            source.connect(processorRef.current);
            processorRef.current.connect(audioInputContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioOutputContextRef.current) {
              const binaryString = atob(base64Audio);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const pcm16 = new Int16Array(bytes.buffer);
              const audioBuffer = audioOutputContextRef.current.createBuffer(1, pcm16.length, 24000);
              const channelData = audioBuffer.getChannelData(0);
              for (let i = 0; i < pcm16.length; i++) {
                channelData[i] = pcm16[i] / 32768;
              }
              const source = audioOutputContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioOutputContextRef.current.destination);
              
              const startTime = Math.max(audioOutputContextRef.current.currentTime, nextPlayTimeRef.current);
              source.start(startTime);
              nextPlayTimeRef.current = startTime + audioBuffer.duration;
            }
            
            if (message.serverContent?.interrupted && audioOutputContextRef.current) {
              audioOutputContextRef.current.suspend();
              audioOutputContextRef.current.resume();
              nextPlayTimeRef.current = audioOutputContextRef.current.currentTime;
            }
          },
          onclose: () => {
            stopLive();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            stopLive();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
          },
          systemInstruction: `Eres Rembrandt, el asistente de IA personal. Estás hablando por voz. Procura ser conciso y conversacional. 
          Aquí está el ADN del usuario:
          ${config.memoria_ia?.perfil ? `- Perfil: ${config.memoria_ia.perfil}\n` : ''}
          ${config.memoria_ia?.estilo ? `- Estilo de redacción/tono: ${config.memoria_ia.estilo}\n` : ''}
          ${config.memoria_ia?.laboral ? `- Trabajo: ${config.memoria_ia.laboral}\n` : ''}
          ${config.memoria_ia?.personal ? `- Personal/Objetivos: ${config.memoria_ia.personal}\n` : ''}`,
        },
      });
      
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start live session:", err);
      setIsConnecting(false);
      stopLive();
    }
  };

  const stopLive = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioInputContextRef.current) {
      audioInputContextRef.current.close();
      audioInputContextRef.current = null;
    }
    if (audioOutputContextRef.current) {
      audioOutputContextRef.current.close();
      audioOutputContextRef.current = null;
    }
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {}
      sessionRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  };

  useEffect(() => {
    return () => {
      stopLive();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-800/95 rounded-xl w-full h-full">
      <div className="mb-12 relative">
        {isConnected && (
          <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-30 scale-[2]"></div>
        )}
        <button
          onClick={isConnected ? stopLive : startLive}
          disabled={isConnecting}
          className={`relative z-10 p-8 rounded-full transition-all duration-300 ${
            isConnected 
              ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_40px_rgba(239,68,68,0.6)]' 
              : 'bg-purple-600 hover:bg-purple-500 shadow-[0_0_30px_rgba(147,51,234,0.4)]'
          }`}
        >
          {isConnecting ? (
            <Loader2 size={48} className="text-white animate-spin" />
          ) : isConnected ? (
            <MicOff size={48} className="text-white" />
          ) : (
            <Mic size={48} className="text-white" />
          )}
        </button>
      </div>
      
      <p className="text-gray-300 text-center max-w-sm text-lg">
        {isConnecting 
          ? "Conectando al asistente..." 
          : isConnected 
            ? "Escuchando... Habla ahora para interactuar." 
            : "Toca el micrófono para iniciar una conversación de voz en tiempo real."}
      </p>
    </div>
  );
};

export default LiveAssistant;
