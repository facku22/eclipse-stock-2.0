import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import Scanner from './Scanner';
import { 
  ShoppingCart, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  CheckCircle2, 
  Camera, 
  X, 
  Zap, 
  CreditCard, 
  DollarSign,
  AlertCircle
} from 'lucide-react';

export default function CartSale({ onVentaRealizada }) {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [notificacion, setNotificacion] = useState(null);
  const [mostrarCamaraModal, setMostrarCamaraModal] = useState(false);
  const [procesandoVenta, setProcesandoVenta] = useState(false);

  const buscadorRef = useRef(null);

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    if (buscadorRef.current) buscadorRef.current.focus();
  }, [carrito]);

  const cargarProductos = async () => {
    const { data, error } = await supabase.from('productos').select('*').order('nombre');
    if (!error) setProductos(data || []);
  };

  const mostrarMensaje = (texto, tipo = 'exito') => {
    setNotificacion({ texto, tipo });
    setTimeout(() => setNotificacion(null), 3000);
  };

  // Agregar producto al carrito
  const agregarAlCarrito = (producto) => {
    setCarrito((prev) => {
      const existeIndex = prev.findIndex((item) => item.id === producto.id);
      
      if (existeIndex >= 0) {
        const itemExistente = prev[existeIndex];
        if (itemExistente.cantidadSeleccionada + 1 > producto.stock) {
          mostrarMensaje(`Stock insuficiente para "${producto.nombre}". Stock disponible: ${producto.stock}`, 'error');
          return prev;
        }
        const copia = [...prev];
        copia[existeIndex] = {
          ...itemExistente,
          cantidadSeleccionada: itemExistente.cantidadSeleccionada + 1
        };
        return copia;
      } else {
        if (producto.stock < 1) {
          mostrarMensaje(`Sin stock de "${producto.nombre}"`, 'error');
          return prev;
        }
        return [...prev, { ...producto, cantidadSeleccionada: 1 }];
      }
    });

    setBusqueda('');
  };

  // Manejar escaneo (Pistola / Entrada manual por Enter)
  const handleEscaneo = (codigo) => {
    const coincidencia = productos.find(
      (p) =>
        (p.codigo_barras && p.codigo_barras.trim().toLowerCase() === codigo.trim().toLowerCase()) ||
        (p.codigo_modelo && p.codigo_modelo.trim().toLowerCase() === codigo.trim().toLowerCase())
    );

    if (coincidencia) {
      agregarAlCarrito(coincidencia);
    } else {
      mostrarMensaje(`Código no encontrado: ${codigo}`, 'error');
    }
  };

  const handleKeyDownBuscador = (e) => {
    if (e.key === 'Enter' && busqueda.trim() !== '') {
      e.preventDefault();
      handleEscaneo(busqueda.trim());
    }
  };

  // Modificar cantidad en carrito
  const cambiarCantidad = (id, cambio) => {
    setCarrito((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nuevaCantidad = item.cantidadSeleccionada + cambio;
            if (nuevaCantidad > item.stock) {
              mostrarMensaje(`Límite de stock alcanzado (${item.stock} unid.)`, 'error');
              return item;
            }
            return nuevaCantidad > 0 ? { ...item, cantidadSeleccionada: nuevaCantidad } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const eliminarDelCarrito = (id) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  const vaciarCarrito = () => {
    if (carrito.length === 0) return;
    if (confirm('¿Deseás vaciar el carrito actual?')) {
      setCarrito([]);
    }
  };

  // Total de la Venta
  const totalItems = carrito.reduce((acc, item) => acc + item.cantidadSeleccionada, 0);
  const totalMonto = carrito.reduce((acc, item) => acc + item.cantidadSeleccionada * (item.precio || 0), 0);

  // Finalizar la Venta y Descontar Stock en Lote
  const finalizarVenta = async () => {
    if (carrito.length === 0) return;

    setProcesandoVenta(true);

    try {
      // 1. Descontar stock e insertar registros en historial
      for (const item of carrito) {
        const nuevoStock = Math.max(0, item.stock - item.cantidadSeleccionada);

        const { error: errUpdate } = await supabase
          .from('productos')
          .update({ stock: nuevoStock })
          .eq('id', item.id);

        if (errUpdate) throw errUpdate;

        await supabase.from('historial_movimientos').insert([
          {
            producto_id: item.id,
            nombre_producto: item.nombre,
            codigo_modelo: item.codigo_modelo || item.codigo_articulo || '',
            codigo_barras: item.codigo_barras || '',
            cantidad: item.cantidadSeleccionada,
            tipo: 'venta',
          },
        ]);
      }

      mostrarMensaje(`¡Venta finalizada con éxito! (${totalItems} artículos)`);
      setCarrito([]);
      await cargarProductos();
      if (onVentaRealizada) onVentaRealizada();
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al procesar la venta: ' + err.message);
    } finally {
      setProcesandoVenta(false);
    }
  };

  const productosSugeridos = productos.filter((p) => {
    if (!busqueda.trim()) return false;
    return (
      (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo_modelo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo_barras || '').toLowerCase().includes(busqueda.toLowerCase())
    );
  });

  return (
    <div className="space-y-4">
      {/* Toast Notificación */}
      {notificacion && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md animate-bounce ${
            notificacion.tipo === 'exito'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/90 border-red-500/40 text-red-200'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold">{notificacion.texto}</span>
        </div>
      )}

      {/* Escáner Superior y Buscador Continuo */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              ref={buscadorRef}
              type="text"
              placeholder="Escanear con pistola o buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={handleKeyDownBuscador}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={() => setMostrarCamaraModal(true)}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition"
          >
            <Camera className="w-5 h-5" />
            Escáner Cámara
          </button>
        </div>

        {/* Coincidencias rápidas al buscar manualmente */}
        {productosSugeridos.length > 0 && (
          <div className="max-h-48 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl p-2 space-y-1">
            {productosSugeridos.map((prod) => (
              <div
                key={prod.id}
                onClick={() => agregarAlCarrito(prod)}
                className="p-2 hover:bg-slate-700/60 rounded-lg cursor-pointer flex justify-between items-center text-xs transition"
              >
                <div>
                  <span className="font-semibold text-slate-100">{prod.nombre}</span>
                  <span className="text-slate-400 ml-2">Mod: {prod.codigo_modelo || '-'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-mono">Stock: {prod.stock}</span>
                  <span className="bg-indigo-600 text-white px-2 py-1 rounded font-bold">+ Agregar</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Estructura Principal del Punto de Venta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Carrito de Productos (2 Columnas en escritorio) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
            <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-400" />
              Lista de la Venta Activa
            </h3>
            {carrito.length > 0 && (
              <button
                onClick={vaciarCarrito}
                className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" /> Vaciar
              </button>
            )}
          </div>

          {carrito.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12 space-y-2">
              <Zap className="w-12 h-12 text-slate-600 animate-pulse" />
              <p className="text-sm font-medium">Escaneá un código de barras para comenzar la venta</p>
            </div>
          ) : (
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[500px]">
              {carrito.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-800/80 border border-slate-700/70 rounded-xl flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {item.imagen_url ? (
                      <img
                        src={item.imagen_url}
                        alt={item.nombre}
                        className="w-10 h-10 object-cover rounded-lg shrink-0 border border-slate-700"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 shrink-0 font-bold">
                        POS
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-slate-100 text-sm truncate">{item.nombre}</h4>
                      <p className="text-xs text-slate-400 font-mono">
                        Mod: {item.codigo_modelo || '-'} | Stock: <span className="text-emerald-400">{item.stock}</span>
                      </p>
                    </div>
                  </div>

                  {/* Controles de Cantidad */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-1">
                      <button
                        onClick={() => cambiarCantidad(item.id, -1)}
                        className="p-1 hover:bg-slate-800 text-slate-300 rounded"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold font-mono text-slate-100">
                        {item.cantidadSeleccionada}
                      </span>
                      <button
                        onClick={() => cambiarCantidad(item.id, 1)}
                        className="p-1 hover:bg-slate-800 text-slate-300 rounded"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {item.precio > 0 && (
                      <span className="text-xs font-bold text-slate-200 min-w-[60px] text-right font-mono">
                        ${item.cantidadSeleccionada * item.precio}
                      </span>
                    )}

                    <button
                      onClick={() => eliminarDelCarrito(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel de Resumen y Cobro */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-100 text-base border-b border-slate-800 pb-3">
              Resumen de la Venta
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Total de Artículos:</span>
                <span className="font-bold text-slate-200 font-mono">{totalItems} unid.</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Variedad de Productos:</span>
                <span className="font-bold text-slate-200 font-mono">{carrito.length} tipos</span>
              </div>
            </div>

            {totalMonto > 0 && (
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-1">
                <span className="text-xs font-medium text-emerald-400">Monto Total Estimado</span>
                <div className="text-2xl font-black text-emerald-300 font-mono">
                  ${totalMonto.toLocaleString()}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={finalizarVenta}
            disabled={carrito.length === 0 || procesandoVenta}
            className={`w-full py-4 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl transition-all ${
              carrito.length === 0 || procesandoVenta
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            {procesandoVenta ? 'Procesando Venta...' : 'Finalizar Venta y Descontar Stock'}
          </button>
        </div>
      </div>

      {/* Modal Cámara Escáner */}
      {mostrarCamaraModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-100">Escaneando Producto...</h4>
              <button onClick={() => setMostrarCamaraModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <Scanner
              onScan={(codigo) => {
                handleEscaneo(codigo);
                setMostrarCamaraModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}