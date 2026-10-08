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
  DollarSign,
  Edit3,
  Printer,
  Receipt
} from 'lucide-react';

export default function CartSale({ onVentaRealizada }) {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [notificacion, setNotificacion] = useState(null);
  const [mostrarCamaraModal, setMostrarCamaraModal] = useState(false);
  const [procesandoVenta, setProcesandoVenta] = useState(false);

  // Estado para guardar la última venta y permitir imprimir el ticket
  const [ultimaVenta, setUltimaVenta] = useState(null);

  // Estado para editar precio unitario temporalmente
  const [editandoPrecioId, setEditandoPrecioId] = useState(null);
  const [tempPrecio, setTempPrecio] = useState('');

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

  const agregarAlCarrito = (producto) => {
    setCarrito((prev) => {
      const existeIndex = prev.findIndex((item) => item.id === producto.id);
      
      if (existeIndex >= 0) {
        const itemExistente = prev[existeIndex];
        if (itemExistente.cantidadSeleccionada + 1 > producto.stock) {
          mostrarMensaje(`Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}`, 'error');
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
        return [...prev, { ...producto, cantidadSeleccionada: 1, precioUnitarioVenta: producto.precio || 0 }];
      }
    });

    setBusqueda('');
  };

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

  const guardarPrecioPersonalizado = (id) => {
    const precioNum = parseFloat(tempPrecio);
    if (!isNaN(precioNum) && precioNum >= 0) {
      setCarrito((prev) =>
        prev.map((item) => (item.id === id ? { ...item, precioUnitarioVenta: precioNum } : item))
      );
    }
    setEditandoPrecioId(null);
  };

  const eliminarDelCarrito = (id) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  const vaciarCarrito = () => {
    if (carrito.length === 0) return;
    if (confirm('¿Deseás vaciar la venta actual?')) {
      setCarrito([]);
    }
  };

  const totalItems = carrito.reduce((acc, item) => acc + item.cantidadSeleccionada, 0);
  const totalMonto = carrito.reduce(
    (acc, item) => acc + item.cantidadSeleccionada * (item.precioUnitarioVenta || 0),
    0
  );

  // Función para imprimir Ticket Comercial
  const imprimirTicketComercial = (datosVenta) => {
    const ventana = window.open('', '_blank');
    if (!ventana) {
      alert('Por favor permití las ventanas emergentes para imprimir el ticket.');
      return;
    }

    const fechaActual = new Date().toLocaleString('es-AR');

    let filasItemsHTML = '';
    datosVenta.items.forEach((item) => {
      const sub = item.cantidadSeleccionada * (item.precioUnitarioVenta || 0);
      filasItemsHTML += `
        <tr>
          <td style="text-align: left; padding: 3px 0;">${item.nombre}</td>
          <td style="text-align: center;">${item.cantidadSeleccionada}</td>
          <td style="text-align: right;">$${item.precioUnitarioVenta || 0}</td>
          <td style="text-align: right; font-weight: bold;">$${sub}</td>
        </tr>
      `;
    });

    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket de Venta - ECLIPSE STOCK</title>
          <style>
            @page { margin: 0; size: 80mm auto; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 280px; 
              margin: 0 auto; 
              padding: 10px; 
              font-size: 11px; 
              color: #000;
              background: #fff;
            }
            .header { text-align: center; margin-bottom: 8px; border-b: 1px dashed #000; padding-bottom: 6px; }
            .empresa { font-size: 16px; font-weight: bold; }
            .subtitulo { font-size: 10px; margin-top: 2px; }
            .info { font-size: 10px; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            th { border-bottom: 1px solid #000; font-size: 10px; padding-bottom: 3px; }
            .totales { border-top: 1px dashed #000; pt: 6px; margin-top: 6px; }
            .total-line { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-top: 4px; }
            .footer { text-align: center; margin-top: 12px; font-size: 10px; border-top: 1px dashed #000; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="empresa">ECLIPSE STOCK</div>
            <div class="subtitulo">COMPROBANTE DE VENTA</div>
            <div class="subtitulo">Consumidor Final</div>
          </div>

          <div class="info">
            <div>Fecha: ${fechaActual}</div>
            <div>Atendido por: Caja 1</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Art.</th>
                <th style="text-align: center;">Cant</th>
                <th style="text-align: right;">P.U.</th>
                <th style="text-align: right;">Subt.</th>
              </tr>
            </thead>
            <tbody>
              ${filasItemsHTML}
            </tbody>
          </table>

          <div class="totales">
            <div style="display: flex; justify-content: space-between;">
              <span>Cant. Artículos:</span>
              <span>${datosVenta.totalItems}</span>
            </div>
            <div class="total-line">
              <span>TOTAL:</span>
              <span>$${datosVenta.totalMonto.toLocaleString()}</span>
            </div>
          </div>

          <div class="footer">
            <div>¡GRACIAS POR SU COMPRA!</div>
            <div style="margin-top: 3px;">Conserve este ticket</div>
          </div>

          <script>
            setTimeout(function() { window.print(); window.close(); }, 400);
          </script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  // Finalizar la Venta
  const finalizarVenta = async () => {
    if (carrito.length === 0) return;

    setProcesandoVenta(true);

    try {
      const datosVentaRealizada = {
        items: [...carrito],
        totalItems,
        totalMonto,
      };

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

      setUltimaVenta(datosVentaRealizada);
      mostrarMensaje(`¡Venta procesada con éxito por $${totalMonto.toLocaleString()}!`);
      setCarrito([]);
      await cargarProductos();
      if (onVentaRealizada) onVentaRealizada();

      // Imprimir ticket automáticamente al confirmar venta
      imprimirTicketComercial(datosVentaRealizada);

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
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
            <input
              ref={buscadorRef}
              type="text"
              placeholder="Apunta la pistola o escribe para buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={handleKeyDownBuscador}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-medium focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>

          <button
            onClick={() => setMostrarCamaraModal(true)}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition text-sm"
          >
            <Camera className="w-5 h-5" />
            Escáner Cámara
          </button>
        </div>

        {/* Búsqueda manual */}
        {productosSugeridos.length > 0 && (
          <div className="max-h-48 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl p-2 space-y-1">
            {productosSugeridos.map((prod) => (
              <div
                key={prod.id}
                onClick={() => agregarAlCarrito(prod)}
                className="p-2.5 hover:bg-slate-700/60 rounded-lg cursor-pointer flex justify-between items-center text-xs transition"
              >
                <div>
                  <span className="font-semibold text-slate-100">{prod.nombre}</span>
                  <span className="text-slate-400 ml-2">Mod: {prod.codigo_modelo || '-'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-300 font-bold font-mono">${prod.precio || 0}</span>
                  <span className="text-emerald-400 font-mono">Stock: {prod.stock}</span>
                  <span className="bg-indigo-600 text-white px-2 py-1 rounded font-bold">+ Agregar</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interfaz del Punto de Venta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Carrito con cantidades y precios */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col min-h-[420px]">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
            <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-400" />
              Productos Escaneados
            </h3>
            {carrito.length > 0 && (
              <button
                onClick={vaciarCarrito}
                className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" /> Vaciar Todo
              </button>
            )}
          </div>

          {carrito.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12 space-y-3">
              <Zap className="w-12 h-12 text-slate-600 animate-pulse" />
              <p className="text-sm font-medium">Escaneá con la pistola para sumar productos a la venta</p>
              
              {ultimaVenta && (
                <button
                  onClick={() => imprimirTicketComercial(ultimaVenta)}
                  className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition"
                >
                  <Receipt className="w-4 h-4" /> Reimprimir Último Ticket
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[500px] pr-1">
              {carrito.map((item) => {
                const subtotal = item.cantidadSeleccionada * (item.precioUnitarioVenta || 0);

                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {item.imagen_url ? (
                        <img
                          src={item.imagen_url}
                          alt={item.nombre}
                          className="w-12 h-12 object-cover rounded-lg shrink-0 border border-slate-700"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 shrink-0 font-bold text-xs">
                          SIN FOTO
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-100 text-sm truncate">{item.nombre}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                          <span>Mod: {item.codigo_modelo || '-'}</span>
                          <span>|</span>
                          <span>Stock: <strong className="text-emerald-400">{item.stock}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-slate-700/50 pt-2 sm:pt-0">
                      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-1">
                        <button
                          onClick={() => cambiarCantidad(item.id, -1)}
                          className="p-1 hover:bg-slate-800 text-slate-300 rounded transition"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold font-mono text-slate-100">
                          {item.cantidadSeleccionada}
                        </span>
                        <button
                          onClick={() => cambiarCantidad(item.id, 1)}
                          className="p-1 hover:bg-slate-800 text-slate-300 rounded transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1 min-w-[100px] justify-end">
                        {editandoPrecioId === item.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={tempPrecio}
                              onChange={(e) => setTempPrecio(e.target.value)}
                              className="w-16 px-1.5 py-0.5 bg-slate-900 border border-indigo-500 rounded text-xs font-mono text-white text-right focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => guardarPrecioPersonalizado(item.id)}
                              className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-500"
                            >
                              ✓
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditandoPrecioId(item.id);
                              setTempPrecio(item.precioUnitarioVenta || '');
                            }}
                            className="group cursor-pointer text-right"
                            title="Tocar para editar precio"
                          >
                            <span className="text-[11px] text-slate-400 block font-sans group-hover:text-indigo-400">
                              c/u: ${item.precioUnitarioVenta || 0} <Edit3 className="w-3 h-3 inline text-slate-500 group-hover:text-indigo-400" />
                            </span>
                            <span className="text-sm font-extrabold text-emerald-400 font-mono block">
                              ${subtotal.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => eliminarDelCarrito(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel Lateral de Cobro */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-100 text-base border-b border-slate-800 pb-3">
              Resumen del Cobro
            </h3>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Unidades Escaneadas:</span>
                <span className="font-bold text-slate-100 font-mono text-sm">{totalItems} unid.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Variedad de Productos:</span>
                <span className="font-bold text-slate-100 font-mono text-sm">{carrito.length} ítems</span>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl space-y-1 shadow-lg">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-emerald-400" /> Total a Cobrar
              </span>
              <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                ${totalMonto.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={finalizarVenta}
              disabled={carrito.length === 0 || procesandoVenta}
              className={`w-full py-4 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl transition-all ${
                carrito.length === 0 || procesandoVenta
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60'
              }`}
            >
              <Printer className="w-5 h-5" />
              {procesandoVenta ? 'Procesando Venta...' : 'Cobrar e Imprimir Ticket'}
            </button>
          </div>
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