import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Calendar, ShoppingBag, Search, RefreshCw, Download } from 'lucide-react';

export default function HistoryList() {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('hoy'); // 'todos' | 'hoy' | 'semana' | 'mes'

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('historial_movimientos')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(300);

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

  const filtrarPorRango = (items) => {
    const ahora = new Date();

    return items.filter((item) => {
      const fechaItem = new Date(item.creado_en);

      if (filtroFecha === 'hoy') {
        return fechaItem.toDateString() === ahora.toDateString();
      }
      if (filtroFecha === 'semana') {
        const haceSieteDias = new Date();
        haceSieteDias.setDate(ahora.getDate() - 7);
        return fechaItem >= haceSieteDias;
      }
      if (filtroFecha === 'mes') {
        return (
          fechaItem.getMonth() === ahora.getMonth() &&
          fechaItem.getFullYear() === ahora.getFullYear()
        );
      }
      return true; // 'todos'
    });
  };

  const movimientosFiltrados = filtrarPorRango(
    movimientos.filter(
      (m) =>
        (m.nombre_producto || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (m.codigo_modelo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (m.codigo_barras || '').toLowerCase().includes(busqueda.toLowerCase())
    )
  );

  const exportarExcelCSV = () => {
    if (movimientosFiltrados.length === 0) {
      alert('No hay datos para exportar en este filtro');
      return;
    }

    const encabezados = ['ID', 'Producto', 'Modelo', 'Codigo Barras', 'Cantidad', 'Fecha y Hora'];
    const filas = movimientosFiltrados.map((m) => [
      m.id,
      `"${m.nombre_producto}"`,
      `"${m.codigo_modelo || ''}"`,
      `"${m.codigo_barras || ''}"`,
      m.cantidad,
      `"${formatearFecha(m.creado_en)}"`
    ]);

    const contenidoCSV = 'data:text/csv;charset=utf-8,\uFEFF' + [encabezados.join(','), ...filas.map((f) => f.join(','))].join('\n');
    const encodedUri = encodeURI(contenidoCSV);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historial_ventas_${filtroFecha}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Barra de Filtros y Exportación */}
      <div className="flex flex-col sm:flex-row gap-2">
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

        <div className="flex gap-2">
          <select
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="hoy">Ventas de Hoy</option>
            <option value="semana">Últimos 7 días</option>
            <option value="mes">Este Mes</option>
            <option value="todos">Todo el Historial</option>
          </select>

          <button
            onClick={exportarExcelCSV}
            className="px-3.5 py-2.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-600/30 text-xs font-bold flex items-center gap-1.5 transition shrink-0"
            title="Exportar archivo CSV / Excel"
          >
            <Download className="w-4 h-4" /> Excel
          </button>

          <button
            onClick={cargarHistorial}
            className="p-2.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl hover:text-indigo-400"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Lista de Registros */}
      <div className="grid gap-2">
        {movimientosFiltrados.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No hay registros para el filtro seleccionado.
          </div>
        ) : (
          movimientosFiltrados.map((item) => (
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