import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Calendar, ShoppingBag, Search, RefreshCw } from 'lucide-react';

export default function HistoryList() {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('historial_movimientos')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(100);

    if (!error) setMovimientos(data || []);
    setLoading(false);
  };

  const formatearFecha = (isoString) => {
    const fecha = new Date(isoString);
    return fecha.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filtrados = movimientos.filter((m) =>
    (m.nombre_producto || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (m.codigo_modelo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (m.codigo_barras || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar en el historial..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button
          onClick={cargarHistorial}
          className="p-2.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl hover:text-indigo-400 transition"
          title="Actualizar historial"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid gap-2">
        {filtrados.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No hay ventas registradas aún.
          </div>
        ) : (
          filtrados.map((item) => (
            <div
              key={item.id}
              className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-100 text-sm">{item.nombre_producto}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>Mod: <span className="font-mono text-slate-300">{item.codigo_modelo || '-'}</span></span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3 h-3" /> {formatearFecha(item.creado_en)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold">
                  -{item.cantidad} unid.
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}