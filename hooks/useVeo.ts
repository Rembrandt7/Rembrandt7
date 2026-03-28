
import { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { AspectRatioVideo, VeoOperation, VideoGenerationReferenceImage, VideoGenerationReferenceType } from '../types';

// Note: The global `window.aistudio` type is defined in `types.ts` to resolve declaration conflicts.

const POLLING_INTERVAL = 10000; // 10 seconds

const loadingMessages = [
    "Warming up the digital canvas...",
    "Choreographing pixels into motion...",
    "Rendering your cinematic masterpiece...",
    "This can take a few minutes, please wait...",
    "Adding the final touches...",
    "Almost there, the director is yelling 'cut!'..."
];

type RefImage = { base64: string; mimeType: string; };

const useVeo = () => {
    const [hasApiKey, setHasApiKey] = useState(true); // Default to true to bypass check
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
    const [error, setError] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    // API Key check disabled as per user request to avoid prompts
    /*
    const checkApiKey = useCallback(async () => {
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
            const keyStatus = await window.aistudio.hasSelectedApiKey();
            setHasApiKey(keyStatus);
        } else {
            console.warn("aistudio API not found. Assuming API key is set via environment.");
            // Fallback for environments without the aistudio object
            setHasApiKey(!!process.env.API_KEY); 
        }
    }, []);

    useEffect(() => {
        checkApiKey();
    }, [checkApiKey]);
    */

    // Fix: Correctly handle setInterval in a browser environment and avoid using NodeJS types.
    useEffect(() => {
        if (!isLoading) {
            return;
        }
        const interval = setInterval(() => {
            setLoadingMessage(prev => {
                const currentIndex = loadingMessages.indexOf(prev);
                const nextIndex = (currentIndex + 1) % loadingMessages.length;
                return loadingMessages[nextIndex];
            });
        }, 5000);
        return () => clearInterval(interval);
    }, [isLoading]);

    // Memory leak fix: Revoke old blob URL when a new one is created or on unmount
    useEffect(() => {
        const currentUrl = videoUrl;
        return () => {
            if (currentUrl) {
                URL.revokeObjectURL(currentUrl);
            }
        };
    }, [videoUrl]);

    const selectApiKey = async () => {
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            await window.aistudio.openSelectKey();
            setHasApiKey(true);
        }
    };
    
    // Polling logic kept but unused since generation is disabled
    const pollOperation = useCallback(async (operation: VeoOperation, ai: GoogleGenAI): Promise<string> => {
        let currentOperation = operation;
        while (!currentOperation.done) {
            await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
            try {
                currentOperation = await ai.operations.getVideosOperation({ operation: currentOperation as any }) as any;
            } catch (e: any) {
                 throw e; 
            }
        }

        if (currentOperation.error) {
            throw new Error(`Video generation failed: ${currentOperation.error.message}`);
        }

        const uri = currentOperation.response?.generatedVideos?.[0]?.video?.uri;
        if (!uri) {
            throw new Error("Video generation completed but no video URI was found.");
        }
        return uri;
    }, []);

    const generateVideo = useCallback(async (
        prompt: string,
        aspectRatio: AspectRatioVideo,
        refImages: (RefImage | null)[]
    ) => {
        // Generation is disabled to prevent API Key Prompt
        setError("La generación de video está deshabilitada temporalmente para evitar la solicitud de API Key.");
        return;

        /* Original Logic commented out
        const activeRefImages = refImages.filter((img): img is RefImage => img !== null);
        
        if (activeRefImages.length === 0 && !prompt) {
             setError("Please provide a prompt.");
             return;
        }

        if (activeRefImages.length > 1 && !prompt) {
            setError("A prompt is required when using multiple reference images.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setVideoUrl(null);
        setLoadingMessage(loadingMessages[0]);

        try {
            if (!process.env.API_KEY) {
                setHasApiKey(false);
                throw new Error("API_KEY is not available. Please select one.");
            }
            // ... generation code ...
        } catch (e: any) {
            console.error(e);
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
        */
    }, [pollOperation]);


    return { generateVideo, isLoading, loadingMessage, videoUrl, error, hasApiKey, selectApiKey };
};

export default useVeo;