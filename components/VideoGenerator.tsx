import React, { useState } from "react";
import { Player } from "@remotion/player";
import { MyVideoTemplate } from "../remotion/MyVideoTemplate";
import { BouncingBallTemplate } from "../remotion/BouncingBallTemplate";
import { Loader2, Download, Video } from "lucide-react";
import { toast } from "sonner";

export const VideoGenerator: React.FC = () => {
  const [title, setTitle] = useState("Rembrandt7 Global Video API");
  const [subtitle, setSubtitle] = useState("Generado dinámicamente con Remotion");
  const [color, setColor] = useState("#3b82f6");
  const [isRendering, setIsRendering] = useState(false);
  const [compositionId, setCompositionId] = useState("GlobalVideoTemplate");
  const [resolution, setResolution] = useState({ width: 1080, height: 1920 });

  const handleRender = async () => {
    setIsRendering(true);
    toast.info("Iniciando renderizado en el servidor...");

    try {
      const API_URL = import.meta.env.VITE_API_URL || "";
      const response = await fetch(`${API_URL}/api/remotion/render`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          titleText: title,
          subtitleText: subtitle,
          themeColor: color,
          compositionId,
          width: resolution.width,
          height: resolution.height,
        }),
      });

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor");
      }

      // Descargar como blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `remotion-render-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("¡Video renderizado y descargado correctamente!");
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al generar el video");
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gray-900 rounded-xl shadow-2xl text-white">
      <div className="flex items-center gap-3 mb-6">
        <Video className="w-8 h-8 text-blue-500" />
        <h2 className="text-2xl font-bold">Motor Global de Video Remotion</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6 bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Plantilla de Video</label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
              value={compositionId}
              onChange={(e) => setCompositionId(e.target.value)}
            >
              <option value="GlobalVideoTemplate">Texto Animado Core</option>
              <option value="BouncingBall">Rebote en el Agua 🌊</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Formato (Aspect Ratio)</label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
              value={`${resolution.width}x${resolution.height}`}
              onChange={(e) => {
                const [w, h] = e.target.value.split("x").map(Number);
                setResolution({ width: w, height: h });
              }}
            >
              <option value="1080x1920">Vertical (TikTok/Reels 9:16)</option>
              <option value="1920x1080">Horizontal (YouTube 16:9)</option>
              <option value="1080x1080">Cuadrado (Instagram 1:1)</option>
            </select>
          </div>

          {compositionId === "GlobalVideoTemplate" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Título Principal</label>
                <input
                  type="text"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Subtítulo</label>
                <input
                  type="text"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Color Temático</label>
                <input
                  type="color"
                  className="w-full h-12 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
            </>
          )}

          <button
            onClick={handleRender}
            disabled={isRendering}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRendering ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Renderizando en la API Global...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Generar `.mp4`
              </>
            )}
          </button>
        </div>

        <div className="bg-black rounded-lg overflow-hidden border border-gray-800 flex flex-col justify-center items-center relative aspect-[9/16] shadow-inner max-h-[600px] h-full mx-auto">
          {compositionId === "GlobalVideoTemplate" ? (
            <Player
              component={MyVideoTemplate}
              inputProps={{ titleText: title, subtitleText: subtitle, themeColor: color }}
              durationInFrames={150}
              fps={30}
              compositionWidth={resolution.width}
              compositionHeight={resolution.height}
              style={{ width: "100%", height: "100%" }}
              controls
              autoPlay
              loop
            />
          ) : (
            <Player
              component={BouncingBallTemplate}
              durationInFrames={300}
              fps={30}
              compositionWidth={resolution.width}
              compositionHeight={resolution.height}
              style={{ width: "100%", height: "100%" }}
              controls
              autoPlay
              loop
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;
