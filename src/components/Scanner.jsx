import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, RefreshCw } from 'lucide-react';

export default function Scanner({ onScan }) {
  const [isScanning, setIsScanning] = useState(false);
  const [errorText, setErrorText] = useState('');
  const html5QrCodeRef = useRef(null);

  const startScanner = async () => {
    setErrorText('');
    setIsScanning(true);

    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        html5QrCodeRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: { width: 300, height: 160 }, // Caja estirada ideal para códigos de barras
          aspectRatio: 1.0,
        };

        try {
          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              onScan(decodedText);
              stopScanner();
            },
            () => {}
          );
        } catch (firstErr) {
          console.warn("Reintentando con lista de dispositivos...", firstErr);
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            const cameraId = devices[devices.length - 1].id;
            await html5QrCode.start(
              cameraId,
              config,
              (decodedText) => {
                onScan(decodedText);
                stopScanner();
              },
              () => {}
            );
          } else {
            throw new Error("No se detectaron cámaras.");
          }
        }
      } catch (err) {
        console.error("Error al acceder a la cámara:", err);
        setErrorText("No se pudo acceder a la cámara. Verificá los permisos del navegador.");
        setIsScanning(false);
      }
    }, 250);
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.error("Error al cerrar cámara:", err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  // Forzar lectura manual en paquetes con arrugas o reflejo
  const handleManualCapture = () => {
    const videoElement = document.querySelector("#reader video");
    if (html5QrCodeRef.current && videoElement) {
      html5QrCodeRef.current
        .scanFileV2(videoElement)
        .then((res) => {
          if (res?.decodedText) {
            onScan(res.decodedText);
            stopScanner();
          }
        })
        .catch(() => {
          // Si el cuadro actual no está claro, avisamos suavemente al usuario
          alert("Asegurate de estirar la bolsa para que el código quede plano y sin reflejos.");
        });
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      {!isScanning ? (
        <button
          type="button"
          onClick={startScanner}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Camera className="w-5 h-5" /> Abrir Escáner de Cámara
        </button>
      ) : (
        <div className="w-full flex flex-col items-center gap-3">
          <div className="relative w-full max-w-sm rounded-xl overflow-hidden border-2 border-indigo-500 shadow-lg bg-slate-900">
            <div id="reader" className="w-full min-h-[250px]"></div>
          </div>

          <div className="flex gap-2 w-full max-w-sm">
            {/* Botón para forzar captura en bolsas con reflejos */}
            <button
              type="button"
              onClick={handleManualCapture}
              className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-2.5 rounded-xl shadow transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" /> Escanear Ahora
            </button>

            {/* Botón para cerrar */}
            <button
              type="button"
              onClick={stopScanner}
              className="w-1/2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold py-2.5 rounded-xl transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {errorText && (
        <p className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 text-center w-full">
          ⚠️ {errorText}
        </p>
      )}
    </div>
  );
}