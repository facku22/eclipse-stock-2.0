import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Share } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detectar si es un iPhone o iPad
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    
    // Verificar si la app ya está instalada
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      setShowPrompt(true);
    }

    // Evento para Android / Chrome (instalación con 1 clic)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallAndroid = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto bg-slate-900 border border-indigo-500/50 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-100">Instalar Eclipse Stock</h4>
            <p className="text-xs text-slate-400">Acceso directo en tu celular</p>
          </div>
        </div>

        <button
          onClick={() => setShowPrompt(false)}
          className="p-1 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {isIOS ? (
        /* Instrucciones claras para iPhone */
        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 text-xs space-y-2 text-slate-300">
          <p className="font-semibold text-indigo-300">Para instalar en iPhone:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              Tocá el botón <strong className="text-white">Compartir</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-indigo-400" /> (abajo en Safari).
            </li>
            <li>
              Buscá y seleccioná <strong className="text-white">"Agregar a inicio"</strong>.
            </li>
          </ol>
        </div>
      ) : (
        /* Botón de 1 Clic para Android */
        <button
          onClick={handleInstallAndroid}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>Instalar App Ahora</span>
        </button>
      )}
    </div>
  );
}