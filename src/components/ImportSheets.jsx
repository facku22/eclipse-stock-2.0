import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { supabase } from '../services/supabase';
import { Upload, FileSpreadsheet, RefreshCw, CheckCircle, AlertTriangle, PlusCircle, X, Image as ImageIcon } from 'lucide-react';

export default function ImportSheets({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Estados para el Modal de Agregar Producto Manual
  const [mostrarModalNuevoProducto, setMostrarModalNuevoProducto] = useState(false);
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    codigo_modelo: '',
    codigo_barras: '',
    stock: 0,
    imagen_url: ''
  });

  const tieneChino = (text) => /[\u4e00-\u9fa5]/.test(text);

  const extraerNumero = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'object') {
      val = val.result !== undefined ? val.result : val.value;
    }
    const str = String(val).replace(/[^0-9]/g, '');
    const num = parseInt(str, 10);
    return !isNaN(num) ? num : 0;
  };

  // Convertir imagen seleccionada localmente a Base64
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es demasiado grande. Por favor seleccioná una imagen de menos de 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNuevoProducto((prev) => ({ ...prev, imagen_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const { data: productosExistentes, error: errorFetch } = await supabase
        .from('productos')
        .select('codigo_barras, stock, imagen_url');

      if (errorFetch) throw errorFetch;

      const mapaExistentes = new Map();
      (productosExistentes || []).forEach((p) => {
        mapaExistentes.set(p.codigo_barras, p);
      });

      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      const productosMap = new Map();

      const imagesMap = new Map();
      worksheet.getImages().forEach((image) => {
        const imgObj = workbook.model.media[image.imageId];
        if (imgObj) {
          const base64 = `data:${imgObj.type};base64,${imgObj.buffer.toString('base64')}`;
          const rowNumber = Math.floor(image.range.tl.row) + 1;
          imagesMap.set(rowNumber, base64);
        }
      });

      worksheet.eachRow((row, rowNumber) => {
        const colCliente = String(row.getCell(1).value || '').trim();
        const colModelo = String(row.getCell(2).value || '').trim();
        const colFotoUrl = String(row.getCell(3).value || '').trim();
        const colNombre = String(row.getCell(4).value || '').trim();

        const codigo = colModelo || colCliente;

        if (
          !codigo ||
          tieneChino(codigo) ||
          codigo.toLowerCase().includes('item') ||
          codigo.toLowerCase().includes('model') ||
          codigo.toLowerCase().includes('no.') ||
          codigo.toLowerCase().includes('número')
        ) {
          return;
        }

        if (
          !colNombre ||
          tieneChino(colNombre) ||
          colNombre.toLowerCase().includes('description') ||
          colNombre.toLowerCase().includes('nombre')
        ) {
          return;
        }

        let imagenFinal = imagesMap.get(rowNumber) || null;
        if (!imagenFinal && (colFotoUrl.startsWith('http://') || colFotoUrl.startsWith('https://'))) {
          imagenFinal = colFotoUrl;
        }

        const qtyPorCaja = extraerNumero(row.getCell(7).value);
        const cantidadCajas = extraerNumero(row.getCell(8).value);

        let stockNuevoIngreso = 0;
        if (qtyPorCaja > 0 && cantidadCajas > 0) {
          stockNuevoIngreso = qtyPorCaja * cantidadCajas;
        } else if (qtyPorCaja > 0) {
          stockNuevoIngreso = qtyPorCaja;
        } else if (cantidadCajas > 0) {
          stockNuevoIngreso = cantidadCajas;
        } else {
          for (let colIdx = 5; colIdx <= 10; colIdx++) {
            const valNum = extraerNumero(row.getCell(colIdx).value);
            if (valNum > 0) {
              stockNuevoIngreso = valNum;
              break;
            }
          }
        }

        const existente = mapaExistentes.get(codigo);
        const stockActualEnBD = existente ? existente.stock : 0;
        const stockFinal = stockActualEnBD + stockNuevoIngreso;

        const imagenDefinitiva = imagenFinal || (existente ? existente.imagen_url : null);

        productosMap.set(codigo, {
          codigo_barras: codigo,
          nombre: colNombre,
          stock: stockFinal,
          precio: 0,
          imagen_url: imagenDefinitiva,
        });
      });

      const productosAInsertar = Array.from(productosMap.values());

      if (productosAInsertar.length === 0) {
        throw new Error('No se encontraron productos válidos en el archivo Excel.');
      }

      const { error } = await supabase
        .from('productos')
        .upsert(productosAInsertar, { onConflict: 'codigo_barras' });

      if (error) throw error;

      setMensaje({
        tipo: 'exito',
        texto: `¡Listo! Se procesaron ${productosAInsertar.length} productos SUMANDO el stock nuevo al inventario actual y creando los artículos nuevos.`,
      });

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error al importar:', err);
      setMensaje({
        tipo: 'error',
        texto: err.message || 'Error al procesar el archivo Excel.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCrearProductoManual = async (e) => {
    e.preventDefault();
    setGuardandoProducto(true);

    try {
      const { error } = await supabase.from('productos').insert([
        {
          nombre: nuevoProducto.nombre,
          codigo_modelo: nuevoProducto.codigo_modelo || null,
          codigo_barras: nuevoProducto.codigo_barras || nuevoProducto.codigo_modelo || null,
          stock: parseInt(nuevoProducto.stock, 10) || 0,
          imagen_url: nuevoProducto.imagen_url || null,
          precio: 0
        }
      ]);

      if (error) throw error;

      setMensaje({
        tipo: 'exito',
        texto: `Se agregó el producto "${nuevoProducto.nombre}" correctamente.`,
      });

      setNuevoProducto({ nombre: '', codigo_modelo: '', codigo_barras: '', stock: 0, imagen_url: '' });
      setMostrarModalNuevoProducto(false);

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error al guardar producto:', err);
      alert('Error al guardar el producto: ' + (err.message || 'Verificá los datos.'));
    } finally {
      setGuardandoProducto(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700/80 p-5 rounded-2xl shadow-lg space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100">Importar Stock Acumulativo (.xlsx)</h3>
          <p className="text-xs text-slate-400">
            Suma la cantidad nueva al stock existente en sistema y crea automáticamente los productos nuevos.
          </p>
        </div>
      </div>

      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-800/40 rounded-xl cursor-pointer transition hover:bg-slate-800/60 group">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {loading ? (
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
          ) : (
            <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-400 transition mb-2" />
          )}
          <p className="text-sm text-slate-300 font-medium text-center px-4">
            {loading ? 'Calculando y sumando stock...' : 'Hacé clic acá para seleccionar tu archivo .xlsx'}
          </p>
        </div>
        <input
          type="file"
          accept=".xlsx"
          onChange={handleFileUpload}
          disabled={loading}
          className="hidden"
        />
      </label>

      {/* Botón para agregar producto manual */}
      <button
        type="button"
        onClick={() => setMostrarModalNuevoProducto(true)}
        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/40 transition-all text-sm"
      >
        <PlusCircle className="w-5 h-5" />
        Agregar Producto Manual
      </button>

      {mensaje.texto && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-medium ${
            mensaje.tipo === 'exito'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
              : 'bg-red-500/10 text-red-300 border-red-500/20'
          }`}
        >
          {mensaje.tipo === 'exito' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Modal Formulario para Crear Nuevo Producto */}
      {mostrarModalNuevoProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setMostrarModalNuevoProducto(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-indigo-400" />
              Agregar Producto Manual
            </h3>

            <form onSubmit={handleCrearProductoManual} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  value={nuevoProducto.nombre}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Ej. Guiso de Ternera"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Código Modelo</label>
                  <input
                    type="text"
                    value={nuevoProducto.codigo_modelo}
                    onChange={(e) => setNuevoProducto({ ...nuevoProducto, codigo_modelo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Ej. MOD-102"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Código de Barras</label>
                  <input
                    type="text"
                    value={nuevoProducto.codigo_barras}
                    onChange={(e) => setNuevoProducto({ ...nuevoProducto, codigo_barras: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="779123456789"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Stock Inicial *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={nuevoProducto.stock}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, stock: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Cargar Foto de Galería o Cámara */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Imagen del Producto</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-800 border border-dashed border-slate-600 hover:border-indigo-500 rounded-xl cursor-pointer transition text-xs text-slate-300 font-medium">
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    {nuevoProducto.imagen_url ? 'Cambiar Imagen' : 'Seleccionar Foto'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>

                  {/* Vista Previa de la Foto */}
                  {nuevoProducto.imagen_url && (
                    <div className="relative w-12 h-12 shrink-0">
                      <img
                        src={nuevoProducto.imagen_url}
                        alt="Previsualización"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => setNuevoProducto((prev) => ({ ...prev, imagen_url: '' }))}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold"
                        title="Quitar foto"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalNuevoProducto(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoProducto}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                >
                  {guardandoProducto ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}