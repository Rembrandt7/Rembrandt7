import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Loader2, Download, Image as ImageIcon } from 'lucide-react';
import IconButton from './common/IconButton';
import { useLinks } from '../contexts/LinkContext';

const ImageGenerator: React.FC = () => {
  const { googleApiConfig } = useLinks();
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "3:4" | "4:3" | "9:16" | "16:9">("1:1");

  const generateImage = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const apiKey = googleApiConfig?.apiKey || process.env.GEMINI_API_KEY || '';
      const ai = new GoogleGenAI({ 
        apiKey: googleApiConfig?.apiKey || process.env.GEMINI_API_KEY || '',
        baseUrl: `${window.location.origin}/api/proxy/google`
      });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: prompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
          },
        },
      });

      let imageFound = false;
      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
            const imageUrl = `data:image/png;base64,${base64EncodeString}`;
            setGeneratedImage(imageUrl);
            imageFound = true;
            break;
          }
        }
      }

      if (!imageFound) {
        setError("No image generated. Please try a different prompt.");
      }

    } catch (err: any) {
      console.error("Error generating image:", err);
      setError(err.message || "Failed to generate image.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-6 space-y-8">
      <div className="w-full bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <ImageIcon className="w-6 h-6 text-purple-400" />
          AI Image Generator
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Prompt
            </label>
            <textarea
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none h-32"
              placeholder="Describe the image you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Aspect Ratio
            </label>
            <div className="flex flex-wrap gap-2">
              {(["1:1", "3:4", "4:3", "9:16", "16:9"] as const).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    aspectRatio === ratio
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generateImage}
            disabled={isLoading || !prompt.trim()}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
              isLoading || !prompt.trim()
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-lg hover:shadow-purple-500/25'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </span>
            ) : (
              'Generate Image'
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}
      </div>

      {generatedImage && (
        <div className="w-full bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Result</h3>
            <IconButton
              onClick={handleDownload}
              tooltip="Download Image"
            >
              <Download className="w-5 h-5" />
            </IconButton>
          </div>
          <div className="flex justify-center bg-gray-900 rounded-lg p-4">
            <img
              src={generatedImage}
              alt="Generated AI Art"
              className="max-w-full max-h-[600px] rounded-lg shadow-md object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGenerator;
