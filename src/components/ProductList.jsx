import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Barcode, Search, MinusCircle, PackageCheck } from 'lucide-react';

export default function ProductList() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [cantidadesLote, setCantidadesLote] = useState({});

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('productos').select('*').order('nombre');
    if (!error) setProductos(data || []);
    setLoading(false);
  };

  const descontarStock = async (id, stockActual, cantidadADescontar) => {
    const nuevoStock = Math.max(0, stockActual - cantidadADescontar);
    
    // Actualización optimista en la pantalla
    setProductos(prev => prev.map(p => p.id === id ? { ...p, stock: nuevoStock } : p));

    const { error } = await supabase
      .from('productos')
      .update({ stock: nuevoStock })
      .eq('id', id);

    if (error) {
      alert('Error al actualizar el stock');
      cargarProductos();
    }
  };

  const handleLoteChange = (id, valor) => {
    setCantidadesLote(prev => ({ ...prev, [id]: valor }));
  };

  const productosFiltrados = productos.filter((p) =>
    (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.codigo_barras || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="grid gap-3">
        {productosFiltrados.map((prod) => {
          const cantidadLote = cantidadesLote[prod.id] || '';
          return (
            <div
              key={prod.id}
              className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                {prod.imagen_url ? (
                  <img src={prod.imagen_url} alt={prod.nombre} className="w-12 h-12 object-cover rounded-lg shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 shrink-0">
                    <Barcode className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-slate-100">{prod.nombre}</h4>
                  <p className="text-xs text-slate-400">
                    Cód: <span className="font-mono text-indigo-400">{prod.codigo_barras || 'Sin código'}</span> | Stock: <span className="text-emerald-400 font-bold">{prod.stock}</span>
                  </p>
                </div>
              </div>

              {/* Botones de acción rápida para empleados */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => descontarStock(prod.id, prod.stock, 1)}
                  className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 text-xs font-medium flex items-center gap-1"
                >
                  <MinusCircle className="w-4 h-4" /> -1 Unid.
                </button>

                <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
                  <input
                    type="number"
                    placeholder="Lote"
                    value={cantidadLote}
                    onChange={(e) => handleLoteChange(prod.id, e.target.value)}
                    className="w-14 bg-transparent text-center text-xs text-slate-100 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const num = parseInt(cantidadLote, 10);
                      if (num > 0) {
                        descontarStock(prod.id, prod.stock, num);
                        handleLoteChange(prod.id, '');
                      }
                    }}
                    className="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium"
                    title="Restar paquete entero"
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}