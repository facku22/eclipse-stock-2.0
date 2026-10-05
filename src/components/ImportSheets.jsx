import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { supabase } from '../services/supabase';
import { Upload, FileSpreadsheet, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ImportSheets({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      // 1. Obtener los productos actuales de Supabase para conocer sus stocks
      const { data: productosExistentes, error: errorFetch } = await supabase
        .from('productos')
        .select('codigo_barras, stock, imagen_url');

      if (errorFetch) throw errorFetch;

      // Crear un mapa para buscar rápidamente por codigo_barras
      const mapaExistentes = new Map();
      (productosExistentes || []).forEach((p) => {
        mapaExistentes.set(p.codigo_barras, p);
      });

      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      const productosMap = new Map();

      // Mapear imágenes del archivo Excel
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

        // Filtrar encabezados y textos en chino
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

        // Obtener imagen de la celda o link
        let imagenFinal = imagesMap.get(rowNumber) || null;
        if (!imagenFinal && (colFotoUrl.startsWith('http://') || colFotoUrl.startsWith('https://'))) {
          imagenFinal = colFotoUrl;
        }

        // Calcular stock nuevo a ingresar de esta fila
        const qtyPorCaja = extraerNumero(row.getCell(7).value); // Columna G
        const cantidadCajas = extraerNumero(row.getCell(8).value); // Columna H

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

        // LÓGICA ACUMULATIVA:
        // Si el producto ya existe en la base de datos, le SUMAMOS el stock nuevo.
        const existente = mapaExistentes.get(codigo);
        const stockActualEnBD = existente ? existente.stock : 0;
        const stockFinal = stockActualEnBD + stockNuevoIngreso;

        // Si ya tiene imagen en BD y no viene una nueva en el Excel, mantenemos la anterior
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

      // Guardar o actualizar en Supabase acumulando stock
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
    </div>
  );
}