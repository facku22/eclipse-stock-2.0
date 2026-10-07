import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Barcode, Search, MinusCircle, PackageCheck, AlertTriangle } from 'lucide-react';

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

  const descontarStock = async (prod, cantidadADescontar) => {
    const nuevoStock = Math.max(0, prod.stock - cantidadADescontar);
    
    // Actualización optimista en pantalla
    setProductos(prev => prev.map(p => p.id === prod.id ? { ...p, stock: nuevoStock } : p));

    // 1. Actualizar stock en la tabla productos
    const { error: errProd } = await supabase
      .from('productos')
      .update({ stock: nuevoStock })
      .eq('id', prod.id);

    if (errProd) {
      alert('Error al actualizar el stock');
      cargarProductos();
      return;
    }

    // 2. Registrar en el Historial de Movimientos
    await supabase.from('historial_movimientos').insert([
      {
        producto_id: prod.id,
        nombre_producto: prod.nombre,
        codigo_modelo: prod.codigo_modelo || prod.codigo_articulo || '',
        codigo_barras: prod.codigo_barras || '',
        cantidad: cantidadADescontar,
        tipo: 'venta'
      }
    ]);
  };

  const handleLoteChange = (id, valor) => {
    setCantidadesLote(prev => ({ ...prev, [id]: valor }));
  };

  const productosFiltrados = productos.filter((p) =>
    (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.codigo_modelo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.codigo_barras || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, modelo o código..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Lista de Productos */}
      <div className="grid gap-3">
        {productosFiltrados.map((prod) => {
          const cantidadLote = cantidadesLote[prod.id] || '';
          const esStockBajo = prod.stock <= 5;

          return (
            <div
              key={prod.id}
              className={`p-4 bg-slate-900 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                esStockBajo ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800'
              }`}
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
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-100">{prod.nombre}</h4>
                    {esStockBajo && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Stock Bajo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Mod: <span className="font-mono text-slate-300">{prod.codigo_modelo || 'Sin modelo'}</span> | Stock:{' '}
                    <span className={`font-bold ${esStockBajo ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {prod.stock}
                    </span>
                  </p>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => descontarStock(prod, 1)}
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
                        descontarStock(prod, num);
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