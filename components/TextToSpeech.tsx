
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useLinks } from '../contexts/LinkContext';
import { decode, decodeAudioData, createWavBlob } from '../utils/audioUtils';
import Spinner from './common/Spinner';
import IconButton from './common/IconButton';

const voices = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];
type Voice = typeof voices[number];

const TextToSpeech: React.FC = () => {
  const { googleApiConfig } = useLinks();
  const [text, setText] = useState<string>('Hello! Have a wonderful day!');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<Voice>('Kore');
  const [generatedAudioData, setGeneratedAudioData] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const activeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';

    recognition.onstart = () => {
        setIsListening(true);
    };

    recognition.onend = () => {
        setIsListening(false);
    };

    recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript + ' ';
            }
        }
        if (finalTranscript) {
            setText(prev => prev + finalTranscript);
        }
    };

    recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
             setError("Microphone permission denied.");
        }
        setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
        setError("Speech recognition is not supported in this browser.");
        return;
    }

    if (isListening) {
        recognitionRef.current.stop();
    } else {
        setError(null);
        recognitionRef.current.start();
    }
  };
  
  const playGeneratedAudio = useCallback(async (base64Audio: string) => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const audioContext = audioContextRef.current;
      
      if (activeAudioSourceRef.current) {
        activeAudioSourceRef.current.stop();
      }

      const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
      
      activeAudioSourceRef.current = source;
      source.onended = () => {
          if (activeAudioSourceRef.current === source) {
              activeAudioSourceRef.current = null;
          }
      };

    } catch (e: any) {
      console.error("Error playing audio:", e);
      setError(`Could not play audio: ${e.message}`);
    }
  }, []);

  const generateSpeech = useCallback(async () => {
    if (!text) {
      setError('Please enter some text to generate speech.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedAudioData(null);

    try {
      const apiKey = googleApiConfig?.apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
          throw new Error("No se ha configurado la API Key de Gemini. Por favor, revísala en los ajustes.");
      }

      const ai = new GoogleGenAI({ 
          apiKey,
          httpOptions: {
              baseUrl: `${window.location.origin}/api/proxy/google`
          }
      });
      const prompt = selectedVoice === 'Kore' ? `Say cheerfully: ${text}` : text;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const candidate = response.candidates?.[0];
      const audioPartData = candidate?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

      if (audioPartData) {
        setGeneratedAudioData(audioPartData);
        await playGeneratedAudio(audioPartData);
      } else {
        let errorMessage = 'No se pudo generar el audio. La IA no devolvió datos de audio.';
        if (candidate?.finishReason === 'SAFETY') {
            errorMessage = 'La generación de audio falló debido a los filtros de seguridad. Por favor, intenta con un texto diferente.';
        } else if (response.text?.trim()) {
            errorMessage = `No se pudo generar el audio: ${response.text.trim()}`;
        }
        setError(errorMessage);
      }

    } catch (e: any) {
      console.error(e);
      const errorMessage = e.message || String(e);
      if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
          setError("You have exceeded your request quota. Please wait a moment or check your plan and billing details.");
      } else if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
          setError("The Text-to-Speech model is currently busy. Please try again in a few moments.");
      } else {
          setError(`An error occurred: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [text, selectedVoice, playGeneratedAudio]);

  const downloadGeneratedAudio = useCallback(() => {
    if (!generatedAudioData) return;
    const pcmData = decode(generatedAudioData);
    const wavBlob = createWavBlob(pcmData, 24000, 1, 16);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-audio.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatedAudioData]);


  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-lg mx-auto">
      
      <h2 className="text-2xl font-bold mb-4 text-center">Generador de Audio (Gemini)</h2>
      <div className="space-y-4">
        <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to convert to speech..."
              className="w-full p-3 pr-12 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow text-gray-200"
              rows={4}
            />
            <div className="absolute top-2 right-2">
                <IconButton 
                    onClick={toggleListening} 
                    isActive={isListening}
                    tooltip={isListening ? "Stop Listening" : "Dictate Text"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-14 0m7 10v1m0 0v1m0-1h.01M12 2a3 3 0 013 3v5a3 3 0 01-6 0V5a3 3 0 013-3z" /></svg>
                </IconButton>
            </div>
        </div>
        <div>
          <label htmlFor="voice-select" className="block mb-2 text-sm font-medium text-gray-400">Voice</label>
          <select
            id="voice-select"
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value as Voice)}
            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500"
          >
            {voices.map((voice) => (
              <option key={voice} value={voice}>{voice}</option>
            ))}
          </select>
        </div>

        {generatedAudioData && (
          <div className="bg-gray-700/50 p-3 rounded-md flex items-center justify-center gap-4 animate-fade-in">
             <p className="text-sm text-gray-300 flex-grow">Audio Generated Successfully</p>
             <IconButton tooltip="Play Again" onClick={() => playGeneratedAudio(generatedAudioData)}>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
             </IconButton>
             <IconButton tooltip="Download WAV" onClick={downloadGeneratedAudio}>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
             </IconButton>
          </div>
        )}

        <button
          onClick={generateSpeech}
          disabled={isLoading || !text}
          className="w-full px-6 py-3 font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading && <Spinner size="5" />}
          {isLoading ? 'Generating Audio...' : 'Generar Audio'}
        </button>
      </div>
      {error && <p className="text-red-400 mt-4 text-center bg-red-900/20 p-2 rounded-md">{error}</p>}
    </div>
  );
};

export default TextToSpeech;
