import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import Scanner from './Scanner';
import BarcodeSVG from 'react-barcode';
import { Edit2, Barcode, Camera, Check, X, Search, Tag, Trash2, Printer, AlertTriangle, Filter, Download } from 'lucide-react';

export default function AdminProductList() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [soloStockBajo, setSoloStockBajo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [imprimiendoProd, setImprimiendoProd] = useState(null);
  
  // Estado para la ventana flotante de imagen ampliada
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);

  const [formEdit, setFormEdit] = useState({
    codigo_modelo: '',
    codigo_barras: '',
    nombre: '',
    stock: 0,
    precio: 0,
  });
  const [mostrarCamaraModal, setMostrarCamaraModal] = useState(false);

  const inputCodigoBarrasRef = useRef(null);

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    if (editando && inputCodigoBarrasRef.current) {
      inputCodigoBarrasRef.current.focus();
    }
  }, [editando]);

  const cargarProductos = async () => {
    const { data, error } = await supabase.from('productos').select('*').order('nombre');
    if (!error) setProductos(data || []);
  };

  const iniciarEdicion = (producto) => {
    setEditando(producto);
    setFormEdit({
      codigo_modelo: producto.codigo_modelo || producto.codigo_articulo || '',
      codigo_barras: producto.codigo_barras || '',
      nombre: producto.nombre || '',
      stock: producto.stock || 0,
      precio: producto.precio || 0,
    });
  };

  const guardarCambios = async (e) => {
    e.preventDefault();
    if (!editando) return;

    try {
      const { error } = await supabase
        .from('productos')
        .update({
          codigo_modelo: formEdit.codigo_modelo,
          codigo_barras: formEdit.codigo_barras || null,
          nombre: formEdit.nombre,
          stock: Number(formEdit.stock),
          precio: Number(formEdit.precio),
        })
        .eq('id', editando.id);

      if (error) throw error;

      setEditando(null);
      cargarProductos();
    } catch (err) {
      alert('Error al guardar cambios: ' + err.message);
    }
  };

  const eliminarProducto = async (id) => {
    if (!confirm('¿Estás seguro de que querés eliminar este producto?')) return;
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (!error) cargarProductos();
  };

  const handleScanCamara = (codigoEscaneado) => {
    setFormEdit((prev) => ({ ...prev, codigo_barras: codigoEscaneado }));
    setMostrarCamaraModal(false);
  };

  const productosFiltrados = productos.filter((p) => {
    const coincideTexto =
      (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo_modelo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo_barras || '').toLowerCase().includes(busqueda.toLowerCase());

    if (soloStockBajo) return coincideTexto && p.stock <= 5;
    return coincideTexto;
  });

  const exportarInventarioCSV = () => {
    if (productosFiltrados.length === 0) return;

    const encabezados = ['ID', 'Nombre', 'Codigo Modelo', 'Codigo Barras', 'Stock', 'Precio'];
    const filas = productosFiltrados.map((p) => [
      p.id,
      `"${p.nombre}"`,
      `"${p.codigo_modelo || ''}"`,
      `"${p.codigo_barras || ''}"`,
      p.stock,
      p.precio || 0,
    ]);

    const contenidoCSV = 'data:text/csv;charset=utf-8,\uFEFF' + [encabezados.join(','), ...filas.map((f) => f.join(','))].join('\n');
    const encodedUri = encodeURI(contenidoCSV);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'inventario_eclipse_stock.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Barra de Búsqueda, Filtro y Exportación */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, modelo o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSoloStockBajo(!soloStockBajo)}
            className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition ${
              soloStockBajo
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            Stock Bajo (≤ 5)
          </button>

          <button
            onClick={exportarInventarioCSV}
            className="px-3.5 py-2.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-600/30 text-xs font-bold flex items-center gap-1.5 transition shrink-0"
            title="Exportar inventario a Excel / CSV"
          >
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* Lista de productos */}
      <div className="grid gap-3">
        {productosFiltrados.map((prod) => {
          const esStockBajo = prod.stock <= 5;
          const codigoParaImprimir = prod.codigo_barras || prod.codigo_modelo || prod.codigo_articulo;

          return (
            <div
              key={prod.id}
              className={`p-4 bg-slate-900 border rounded-xl flex items-center justify-between ${
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
                        <AlertTriangle className="w-3 h-3" /> Reponer
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-xs text-slate-400 mt-0.5">
                    <span>
                      Modelo: <span className="font-mono text-slate-200">{prod.codigo_modelo || 'Sin modelo'}</span>
                    </span>
                    <span>|</span>
                    <span>
                      Barras: <span className="font-mono text-indigo-400">{prod.codigo_barras || 'Sin registrar'}</span>
                    </span>
                    <span>|</span>
                    <span>
                      Stock: <strong className={esStockBajo ? 'text-amber-400' : 'text-emerald-400'}>{prod.stock}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {codigoParaImprimir && (
                  <button
                    onClick={() => setImprimiendoProd(prod)}
                    className="p-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg hover:text-indigo-400 transition"
                    title="Imprimir Etiqueta"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => iniciarEdicion(prod)}
                  className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 flex items-center gap-1 text-xs font-medium"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => eliminarProducto(prod.id)}
                  className="p-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Edición */}
      {editando && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100">Editar Producto</h3>
              <button onClick={() => setEditando(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={guardarCambios} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" /> Código de Modelo / Artículo
                </label>
                <input
                  type="text"
                  value={formEdit.codigo_modelo}
                  onChange={(e) => setFormEdit({ ...formEdit, codigo_modelo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Barcode className="w-3.5 h-3.5 text-indigo-400" /> Código de Barras (Pistola/Cámara)
                </label>
                <div className="flex gap-2">
                  <input
                    ref={inputCodigoBarrasRef}
                    type="text"
                    value={formEdit.codigo_barras}
                    onChange={(e) => setFormEdit({ ...formEdit, codigo_barras: e.target.value })}
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarCamaraModal(true)}
                    className="p-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl hover:text-indigo-400"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formEdit.nombre}
                  onChange={(e) => setFormEdit({ ...formEdit, nombre: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Stock</label>
                  <input
                    type="number"
                    value={formEdit.stock}
                    onChange={(e) => setFormEdit({ ...formEdit, stock: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Precio</label>
                  <input
                    type="number"
                    value={formEdit.precio}
                    onChange={(e) => setFormEdit({ ...formEdit, precio: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditando(null)} className="px-4 py-2 text-sm text-slate-400">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium text-sm flex items-center gap-2">
                  <Check className="w-4 h-4" /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Impresión */}
      {imprimiendoProd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 text-center space-y-4">
            <h3 className="text-base font-bold text-slate-100">Vista Previa de Etiqueta</h3>

            <div className="bg-white p-4 rounded-xl text-black flex flex-col items-center justify-center space-y-1">
              <span className="font-bold text-sm tracking-tight">{imprimiendoProd.nombre}</span>
              <span className="text-xs text-gray-600 font-mono">Mod: {imprimiendoProd.codigo_modelo || '-'}</span>
              <BarcodeSVG
                value={imprimiendoProd.codigo_barras || imprimiendoProd.codigo_modelo || '00000'}
                width={1.5}
                height={50}
                fontSize={12}
              />
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setImprimiendoProd(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

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
            <Scanner onScan={handleScanCamara} />
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