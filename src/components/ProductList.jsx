import React, { useState } from 'react';
import { Plus, Minus, Trash2, Edit2, Check, X, AlertCircle, Image as ImageIcon, ArrowDownLeft } from 'lucide-react';
import { supabase } from '../services/supabase';

export default function ProductList({ productos, rol, onUpdate, registrarMovimiento }) {
  const [editingId, setEditingId] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editPrecio, setEditPrecio] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editImagen, setEditImagen] = useState('');

  // Estado para manejar la cantidad personalizada por producto
  const [cantidadesLote, setCantidadesLote] = useState({});

  // Manejar el cambio de texto en la casilla de cantidad por lote
  const handleCantidadChange = (id, valor) => {
    setCantidadesLote((prev) => ({
      ...prev,
      [id]: valor,
    }));
  };

  // Función general para descontar o sumar N unidades
  const handleAjustarStock = async (producto, cambio) => {
    if (cambio > 0 && rol !== 'ADMIN') {
      alert('🔒 Solo los administradores pueden sumar stock.');
      return;
    }

    const nuevoStock = producto.stock + cambio;
    if (nuevoStock < 0) {
      alert(`No podés descontar ${Math.abs(cambio)} unidades porque el stock actual es ${producto.stock}.`);
      return;
    }

    try {
      const { error } = await supabase
        .from('productos')
        .update({ stock: nuevoStock })
        .eq('id', producto.id);

      if (error) throw error;

      if (registrarMovimiento) {
        const tipo = cambio > 0 ? 'INGRESO' : 'VENTA/SALIDA';
        const motivo = Math.abs(cambio) > 1 ? `Venta/Ajuste por lote (${Math.abs(cambio)} u.)` : `Ajuste (${rol})`;
        await registrarMovimiento(producto.id, tipo, Math.abs(cambio), motivo);
      }

      // Limpiar la casilla de lote para este producto
      setCantidadesLote((prev) => ({ ...prev, [producto.id]: '' }));

      onUpdate();
    } catch (err) {
      console.error('Error actualizando stock:', err);
      alert('No se pudo actualizar el stock.');
    }
  };

  // Descontar la cantidad que ingresó el usuario en la casilla
  const handleDescontarLote = (producto) => {
    const cantidad = parseInt(cantidadesLote[producto.id], 10);
    if (isNaN(cantidad) || cantidad <= 0) {
      alert('Ingresá un número válido mayor a 0 para descontar por lote.');
      return;
    }
    handleAjustarStock(producto, -cantidad);
  };

  const handleEliminar = async (id, nombre) => {
    if (!confirm(`¿Estás seguro de que querés eliminar "${nombre}"?`)) return;

    try {
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error('Error eliminando producto:', err);
      alert('Error al eliminar el producto.');
    }
  };

  const handleStartEdit = (prod) => {
    setEditingId(prod.id);
    setEditNombre(prod.nombre);
    setEditPrecio(prod.precio);
    setEditStock(prod.stock);
    setEditImagen(prod.imagen_url || '');
  };

  const handleSaveEdit = async (id) => {
    try {
      const { error } = await supabase
        .from('productos')
        .update({
          nombre: editNombre,
          precio: parseFloat(editPrecio) || 0,
          stock: parseInt(editStock) || 0,
          imagen_url: editImagen || null,
        })
        .eq('id', id);

      if (error) throw error;
      setEditingId(null);
      onUpdate();
    } catch (err) {
      console.error('Error guardando producto:', err);
      alert('Error al guardar las modificaciones.');
    }
  };

  if (productos.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 flex flex-col items-center justify-center gap-2">
        <AlertCircle className="w-8 h-8 text-slate-500" />
        <p className="text-sm">No se encontraron productos registrados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
        Inventario ({productos.length})
      </h2>

      <div className="grid grid-cols-1 gap-3">
        {productos.map((p) => {
          const isEditing = editingId === p.id;
          const cantidadLote = cantidadesLote[p.id] || '';

          return (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-600 transition"
            >
              {/* Información del Producto e Imagen */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="shrink-0">
                  {p.imagen_url ? (
                    <img
                      src={p.imagen_url}
                      alt={p.nombre}
                      className="w-16 h-16 object-cover rounded-xl border border-slate-700 bg-slate-800 shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-slate-800/80 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-slate-500 text-[10px] gap-1">
                      <ImageIcon className="w-5 h-5 text-slate-600" />
                      <span>Sin Foto</span>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1 text-sm text-slate-100"
                      placeholder="Nombre del producto"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={editPrecio}
                        onChange={(e) => setEditPrecio(e.target.value)}
                        className="w-1/3 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1 text-sm text-slate-100"
                        placeholder="Precio"
                      />
                      <input
                        type="number"
                        value={editStock}
                        onChange={(e) => setEditStock(e.target.value)}
                        className="w-1/3 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1 text-sm text-slate-100"
                        placeholder="Stock"
                      />
                      <input
                        type="text"
                        value={editImagen}
                        onChange={(e) => setEditImagen(e.target.value)}
                        className="w-1/3 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1 text-sm text-slate-100"
                        placeholder="URL Foto"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-100 text-base truncate">{p.nombre}</h3>
                      {p.stock <= 3 && (
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                          Poco Stock
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                      <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700/50">
                        Cód: {p.codigo_barras}
                      </span>
                      {p.precio > 0 && (
                        <span className="text-emerald-400 font-bold text-sm">
                          ${Number(p.precio).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Controles de Stock: Botones + / - y Venta por Lote */}
              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                {isEditing ? (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleSaveEdit(p.id)}
                      className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                      title="Guardar"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition"
                      title="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* 📦 CASILLA DE VENTA POR LOTE / CANTIDAD PERSONALIZADA */}
                    <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-xl p-1 gap-1">
                      <input
                        type="number"
                        min="1"
                        placeholder="Lote"
                        value={cantidadLote}
                        onChange={(e) => handleCantidadChange(p.id, e.target.value)}
                        className="w-14 bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold rounded-lg px-2 py-1 text-center focus:outline-none focus:border-indigo-500"
                        title="Ingresá una cantidad para descontar en lote (ej: 30)"
                      />
                      <button
                        onClick={() => handleDescontarLote(p)}
                        className="px-2 py-1 bg-rose-600/20 border border-rose-500/30 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition text-xs font-bold flex items-center gap-1 active:scale-95"
                        title="Descontar lote ingresado"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>Restar</span>
                      </button>
                    </div>

                    {/* CONTADORES RÁPIDOS +1 / -1 */}
                    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 gap-1">
                      <button
                        onClick={() => handleAjustarStock(p, -1)}
                        className="p-2 bg-slate-700 hover:bg-red-600/80 text-slate-200 hover:text-white rounded-lg transition active:scale-95"
                        title="Descontar 1 unidad"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <span className="w-10 text-center font-bold text-sm text-slate-100">
                        {p.stock}
                      </span>

                      <button
                        onClick={() => handleAjustarStock(p, 1)}
                        disabled={rol !== 'ADMIN'}
                        className={`p-2 rounded-lg transition ${
                          rol === 'ADMIN'
                            ? 'bg-slate-700 hover:bg-emerald-600/80 text-slate-200 hover:text-white active:scale-95 cursor-pointer'
                            : 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed opacity-40'
                        }`}
                        title={rol === 'ADMIN' ? 'Sumar 1 unidad' : 'Reservado para Admin'}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Acciones para Admin */}
                    {rol === 'ADMIN' && (
                      <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
                        <button
                          onClick={() => handleStartEdit(p)}
                          className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                          title="Editar Producto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEliminar(p.id, p.nombre)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                          title="Eliminar Producto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}