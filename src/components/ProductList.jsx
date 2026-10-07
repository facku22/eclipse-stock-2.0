import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import Scanner from './Scanner';
import { Barcode, Search, MinusCircle, PackageCheck, AlertTriangle, Zap, CheckCircle2, Camera, X, Check } from 'lucide-react';

export default function ProductList() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cantidadesLote, setCantidadesLote] = useState({});
  const [notificacion, setNotificacion] = useState(null);
  const [modoVentaRapida, setModoVentaRapida] = useState(true);
  const [mostrarCamaraModal, setMostrarCamaraModal] = useState(false);
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
  
  // Nuevo estado para el modal de confirmación de escaneo
  const [productoEscaneado, setProductoEscaneado] = useState(null);

  const buscadorRef = useRef(null);

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    if (buscadorRef.current) buscadorRef.current.focus();
  }, []);

  const cargarProductos = async () => {
    const { data, error } = await supabase.from('productos').select('*').order('nombre');
    if (!error) setProductos(data || []);
  };

  const mostrarMensaje = (texto, tipo = 'exito') => {
    setNotificacion({ texto, tipo });
    setTimeout(() => setNotificacion(null), 3000);
  };

  const descontarStock = async (prod, cantidadADescontar) => {
    const nuevoStock = Math.max(0, prod.stock - cantidadADescontar);

    setProductos((prev) => prev.map((p) => (p.id === prod.id ? { ...p, stock: nuevoStock } : p)));

    const { error: errProd } = await supabase
      .from('productos')
      .update({ stock: nuevoStock })
      .eq('id', prod.id);

    if (errProd) {
      alert('Error al actualizar el stock');
      cargarProductos();
      return;
    }

    await supabase.from('historial_movimientos').insert([
      {
        producto_id: prod.id,
        nombre_producto: prod.nombre,
        codigo_modelo: prod.codigo_modelo || prod.codigo_articulo || '',
        codigo_barras: prod.codigo_barras || '',
        cantidad: cantidadADescontar,
        tipo: 'venta',
      },
    ]);

    mostrarMensaje(`Se descontó ${cantidadADescontar} unid. de "${prod.nombre}"`);
  };

  // Manejador del escaneo: Ahora abre el modal en lugar de descontar
  const handleEscaneoDirecto = (codigo) => {
    const coincidencia = productos.find(
      (p) =>
        (p.codigo_barras && p.codigo_barras.trim() === codigo.trim()) ||
        (p.codigo_modelo && p.codigo_modelo.trim().toLowerCase() === codigo.trim().toLowerCase())
    );

    if (coincidencia) {
      setProductoEscaneado(coincidencia);
      setBusqueda('');
    } else {
      mostrarMensaje(`Código no encontrado: ${codigo}`, 'error');
    }
  };

  const handleKeyDownBuscador = (e) => {
    if (e.key === 'Enter' && modoVentaRapida && busqueda.trim() !== '') {
      e.preventDefault();
      handleEscaneoDirecto(busqueda.trim());
    }
  };

  const handleLoteChange = (id, valor) => {
    setCantidadesLote((prev) => ({ ...prev, [id]: valor }));
  };

  const productosFiltrados = productos.filter(
    (p) =>
      (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo_modelo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo_barras || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toast Notificación Flotante */}
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

      {/* Barra superior de opciones y lectora */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <input
            ref={buscadorRef}
            type="text"
            placeholder={
              modoVentaRapida
                ? 'Escaneá con la pistola lectora o buscá...'
                : 'Buscar por nombre, modelo o código...'
            }
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={handleKeyDownBuscador}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setModoVentaRapida(!modoVentaRapida)}
            className={`flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              modoVentaRapida
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Abre ventana de confirmación al escanear"
          >
            <Zap className={`w-4 h-4 ${modoVentaRapida ? 'text-amber-400 fill-amber-400' : ''}`} />
            Escaneo Directo: {modoVentaRapida ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setMostrarCamaraModal(true)}
            className="p-2.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl hover:text-indigo-400"
            title="Escanear con Cámara"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Lista de Productos */}
      <div className="grid gap-3">
        {productosFiltrados.map((prod) => {
          const cantidadLote = cantidadesLote[prod.id] || '';
          const esStockBajo = prod.stock <= 5;

          return (
            <div
              key={prod.id}
              className={`p-4 bg-slate-900 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                esStockBajo ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {prod.imagen_url ? (
                  <img
                    src={prod.imagen_url}
                    alt={prod.nombre}
                    onClick={() => setImagenSeleccionada(prod.imagen_url)}
                    className="w-12 h-12 object-cover rounded-lg shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    title="Hacé clic para ampliar"
                  />
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
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mod: <span className="font-mono text-slate-300">{prod.codigo_modelo || 'Sin modelo'}</span> | Stock:{' '}
                    <span className={`font-bold ${esStockBajo ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {prod.stock}
                    </span>
                  </p>
                </div>
              </div>

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
                    className="w-14 bg-transparent text-center text-xs text-slate-100 focus:outline-none font-mono"
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

      {/* Modal Cámara */}
      {mostrarCamaraModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-100">Apunta al código de barras</h4>
              <button onClick={() => setMostrarCamaraModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <Scanner
              onScan={(codigo) => {
                handleEscaneoDirecto(codigo);
                setMostrarCamaraModal(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Escaneo */}
      {productoEscaneado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setProductoEscaneado(null)}
        >
          <div
            className="relative bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl flex flex-col items-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setProductoEscaneado(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-slate-200 font-bold text-base text-center">Producto Escaneado</h3>

            {/* Imagen del producto */}
            {productoEscaneado.imagen_url ? (
              <img
                src={productoEscaneado.imagen_url}
                alt={productoEscaneado.nombre}
                className="w-24 h-24 object-cover rounded-xl border border-slate-700"
              />
            ) : (
              <div className="w-24 h-24 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 border border-slate-700">
                <Barcode className="w-10 h-10" />
              </div>
            )}

            {/* Detalle y Stock */}
            <div className="text-center space-y-1 w-full">
              <h4 className="text-lg font-bold text-slate-100">{productoEscaneado.nombre}</h4>
              <p className="text-xs text-slate-400">
                Modelo: <span className="font-mono text-slate-200">{productoEscaneado.codigo_modelo || 'Sin modelo'}</span>
              </p>
              <div className="mt-2 py-2 px-4 bg-slate-800 rounded-xl border border-slate-700 flex justify-between items-center">
                <span className="text-xs text-slate-400">Stock Actual:</span>
                <span className="text-base font-bold text-emerald-400">{productoEscaneado.stock} unid.</span>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-2 w-full pt-2">
              <button
                onClick={() => setProductoEscaneado(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>

              <button
                onClick={() => {
                  descontarStock(productoEscaneado, 1);
                  setProductoEscaneado(null);
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950 transition"
              >
                <Check className="w-4 h-4" /> Descontar 1
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Vista Previa de Imagen Ampliada */}
      {imagenSeleccionada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setImagenSeleccionada(null)}
        >
          <div
            className="relative bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md sm:max-w-lg w-full shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setImagenSeleccionada(null)}
              className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-9 h-9 flex items-center justify-center font-bold shadow-lg hover:bg-red-600 transition-colors text-base"
            >
              ✕
            </button>

            <h3 className="text-slate-300 font-semibold mb-3 text-base">Vista de Imagen</h3>

            <img
              src={imagenSeleccionada}
              alt="Producto ampliado"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg border border-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
}