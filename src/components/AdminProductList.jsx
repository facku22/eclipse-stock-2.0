import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import Scanner from './Scanner';
import { Edit2, Barcode, Camera, Check, X, Search, Tag, Trash2 } from 'lucide-react';

export default function AdminProductList() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(null);
  
  const [formEdit, setFormEdit] = useState({
    codigo_modelo: '',
    codigo_barras: '',
    nombre: '',
    stock: 0,
    precio: 0
  });
  const [mostrarCamaraModal, setMostrarCamaraModal] = useState(false);

  const inputCodigoBarrasRef = useRef(null);

  useEffect(() => {
    cargarProductos();
  }, []);

  // Foco automático en el campo de Código de Barras para la pistola lectora
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
          codigo_barras: formEdit.codigo_barras || null, // Guarda null si está vacío para evitar conflictos
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
    if (!error) {
      cargarProductos();
    } else {
      alert('Error al eliminar: ' + error.message);
    }
  };

  const handleScanCamara = (codigoEscaneado) => {
    setFormEdit((prev) => ({ ...prev, codigo_barras: codigoEscaneado }));
    setMostrarCamaraModal(false);
  };

  const productosFiltrados = productos.filter((p) =>
    (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.codigo_modelo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.codigo_barras || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Buscador de productos */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, modelo o código de barras..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Lista de productos */}
      <div className="grid gap-3">
        {productosFiltrados.map((prod) => (
          <div
            key={prod.id}
            className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {prod.imagen_url ? (
                <img src={prod.imagen_url} alt={prod.nombre} className="w-12 h-12 object-cover rounded-lg" />
              ) : (
                <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500">
                  <Barcode className="w-6 h-6" />
                </div>
              )}
              <div>
                <h4 className="font-semibold text-slate-100">{prod.nombre}</h4>
                <div className="flex flex-wrap gap-x-3 text-xs text-slate-400 mt-0.5">
                  <span>
                    Modelo: <span className="font-mono text-slate-200">{prod.codigo_modelo || 'Sin modelo'}</span>
                  </span>
                  <span>|</span>
                  <span>
                    Barras: <span className="font-mono text-indigo-400">{prod.codigo_barras || 'Sin registrar'}</span>
                  </span>
                  <span>|</span>
                  <span>Stock: <strong className="text-emerald-400">{prod.stock}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => iniciarEdicion(prod)}
                className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 flex items-center gap-1.5 text-xs font-medium"
              >
                <Edit2 className="w-4 h-4" /> Editar
              </button>
              <button
                onClick={() => eliminarProducto(prod.id)}
                className="p-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20"
                title="Eliminar producto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Edición */}
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
              {/* Código de Modelo */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" /> Código de Modelo / Artículo
                </label>
                <input
                  type="text"
                  value={formEdit.codigo_modelo}
                  onChange={(e) => setFormEdit({ ...formEdit, codigo_modelo: e.target.value })}
                  placeholder="Ej: MOD-1052"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Código de Barras para lectora / cámara */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Barcode className="w-3.5 h-3.5 text-indigo-400" /> Código de Barras (Pistola lectora o Cámara)
                </label>
                <div className="flex gap-2">
                  <input
                    ref={inputCodigoBarrasRef}
                    type="text"
                    value={formEdit.codigo_barras}
                    onChange={(e) => setFormEdit({ ...formEdit, codigo_barras: e.target.value })}
                    placeholder="Escaneá el código de la etiqueta aquí..."
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarCamaraModal(true)}
                    className="p-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl hover:text-indigo-400 transition"
                    title="Escanear con cámara"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  value={formEdit.nombre}
                  onChange={(e) => setFormEdit({ ...formEdit, nombre: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Stock y Precio */}
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

              {/* Botones */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cámara */}
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
    </div>
  );
}