import React from 'react';
import { X, ExternalLink, MessageCircle } from 'lucide-react';

interface WhatsAppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const WhatsAppSidebar: React.FC<WhatsAppSidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-4 bg-[#00a884] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            <span className="font-bold text-lg">WhatsApp Web</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 bg-slate-100 p-6 flex flex-col items-center justify-center text-center">
            <div className="bg-white p-8 rounded-2xl shadow-sm max-w-sm w-full">
                <div className="w-16 h-16 bg-[#00a884]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-[#00a884]" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Abrir WhatsApp Web</h3>
                <p className="text-slate-500 text-sm mb-6">
                    Por políticas de seguridad de WhatsApp, no es posible incrustar la aplicación directamente dentro de otras páginas.
                </p>
                <button 
                    onClick={() => window.open('https://web.whatsapp.com', '_blank', 'width=1000,height=700')}
                    className="w-full py-3 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#00a884]/20"
                >
                    <ExternalLink className="w-4 h-4" />
                    Abrir en Ventana
                </button>
            </div>
            
            <p className="mt-8 text-xs text-slate-400">
                Tip: Coloca la ventana de WhatsApp al lado de esta lista para trabajar mejor.
            </p>
        </div>
      </div>
    </>
  );
};

export default WhatsAppSidebar;
