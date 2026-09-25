import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    if (isStandalone) {
      return; // Already installed and running as PWA
    }

    // Check if dismissed recently (24h cooldown)
    const dismissedUntil = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    // Android / Chrome / Edge handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Wait a moment so it doesn't pop up immediately on first second of load
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    if (isIosDevice && !isStandalone) {
      setIsIos(true);
      setTimeout(() => setShowPrompt(true), 4000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIosGuide(false);
    // Dismiss for 24 hours
    localStorage.setItem('pwa_prompt_dismissed', String(Date.now() + 24 * 60 * 60 * 1000));
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-6 left-6 z-[9990] max-w-sm glass-panel-heavy rounded-2xl p-4 shadow-[0_10px_35px_rgba(0,0,0,0.6)] border border-purple-500/30 ring-1 ring-white/10"
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg flex-shrink-0">
            <Smartphone size={22} />
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-sm font-semibold text-white tracking-wide">
              Instalar Rembrandt en tu Teléfono
            </h4>
            <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">
              Úsalo a pantalla completa como una app nativa, con acceso rápido y sin barras del navegador.
            </p>

            {showIosGuide ? (
              <div className="mt-2.5 p-2 bg-purple-900/40 rounded-lg border border-purple-400/20 text-[11px] text-purple-200 flex items-center gap-2">
                <Share size={14} className="text-purple-300 flex-shrink-0" />
                <span>Pulsa <strong>Compartir</strong> en Safari y elige <strong>"Agregar a Inicio"</strong>.</span>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
                >
                  <Download size={14} />
                  <span>{isIos ? 'Cómo instalar' : 'Instalar Ahora'}</span>
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Más tarde
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
