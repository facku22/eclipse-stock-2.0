import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../services/supabase';
import Scanner from './Scanner';
import { Upload, Plus, Check, Camera, Barcode, Tag, DollarSign, Package, AlertCircle } from 'lucide-react';

export default function ImportSheets() {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [mostrarCamaraModal, setMostrarCamaraModal] = useState(false);

  // Formulario manual
  const [formManual, setFormManual] = useState({
    nombre: '',
    codigo_modelo: '',
    codigo_barras: '',
    stock: 1,
    precio: 0,
  });

  const inputCodigoBarrasRef = useRef(null);

  // Focus en el código de barras si abre el módulo
  useEffect(() => {
    if (inputCodigoBarrasRef.current) {
      inputCodigoBarrasRef.current.focus();
    }
  }, []);

  const mostrarNotificacion = (texto, tipo = 'exito') => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 4000);
  };

  // Cargar producto manualmente
  const handleAgregarManual = async (e) => {
    e.preventDefault();
    if (!formManual.nombre.trim()) {
      mostrarNotificacion('El nombre del producto es obligatorio', 'error');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('productos').insert([
        {
          nombre: formManual.nombre.trim(),
          codigo_modelo: formManual.codigo_modelo.trim() || null,
          codigo_barras: formManual.codigo_barras.trim() || null,
          stock: Number(formManual.stock) || 0,
          precio: Number(formManual.precio) || 0,
        },
      ]);

      if (error) throw error;

      mostrarNotificacion(`¡Producto "${formManual.nombre}" guardado con éxito!`);
      setFormManual({
        nombre: '',
        codigo_modelo: '',
        codigo_barras: '',
        stock: 1,
        precio: 0,
      });

      if (inputCodigoBarrasRef.current) inputCodigoBarrasRef.current.focus();
    } catch (err) {
      console.error(err);
      mostrarNotificacion('Error al crear producto: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleScanCamara = (codigo) => {
    setFormManual((prev) => ({ ...prev, codigo_barras: codigo }));
    setMostrarCamaraModal(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
      {/* Mensaje de estado */}
      {mensaje && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            mensaje.tipo === 'exito'
              ? 'bg-emerald-950/80 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/80 border border-red-500/30 text-red-300'
          }`}
        >
          {mensaje.tipo === 'exito' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {mensaje.texto}
        </div>
      )}

      <div>
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-400" /> Carga Manual de Producto
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Ingresá un nuevo ítem al inventario escaneando el código de barras con la pistola o la cámara.
        </p>
      </div>

      <form onSubmit={handleAgregarManual} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Código de Barras con botón de Cámara */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
              <Barcode className="w-3.5 h-3.5 text-indigo-400" /> Código de Barras
            </label>
            <div className="flex gap-2">
              <input
                ref={inputCodigoBarrasRef}
                type="text"
                placeholder="Escanear con pistola..."
                value={formManual.codigo_barras}
                onChange={(e) => setFormManual({ ...formManual, codigo_barras: e.target.value })}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono text-xs focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setMostrarCamaraModal(true)}
                className="p-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl hover:text-indigo-400 hover:border-indigo-500/50 transition"
                title="Escanear con cámara"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Código de Modelo */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-slate-400" /> Código de Modelo / Artículo
            </label>
            <input
              type="text"
              placeholder="Ej: L1992"
              value={formManual.codigo_modelo}
              onChange={(e) => setFormManual({ ...formManual, codigo_modelo: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Nombre del Producto */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Nombre del Producto *</label>
          <input
            type="text"
            placeholder="Ej: Exhibidor Fashion Stand"
            value={formManual.nombre}
            onChange={(e) => setFormManual({ ...formManual, nombre: e.target.value })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Stock Inicial */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-emerald-400" /> Stock Inicial
            </label>
            <input
              type="number"
              min="0"
              value={formManual.stock}
              onChange={(e) => setFormManual({ ...formManual, stock: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Precio Unitario */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Precio ($)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={formManual.precio}
              onChange={(e) => setFormManual({ ...formManual, precio: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 transition"
        >
          <Plus className="w-4 h-4" />
          {loading ? 'Guardando...' : 'Guardar Producto en Inventario'}
        </button>
      </form>

      {/* Modal Cámara Escáner */}
      {mostrarCamaraModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-100">Escaneando Código de Barras...</h4>
              <button onClick={() => setMostrarCamaraModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <Scanner onScan={handleScanCamara} />
          </div>
        </div>
      )}
    </div>
  );
}