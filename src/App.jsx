import React, { useState, useEffect } from 'react';
import { Shield, User, Search, Upload, Camera, Lock, KeyRound, LogOut, Plus, X } from 'lucide-react';
import { supabase } from './services/supabase';

import ProductList from './components/ProductList';
import Scanner from './components/Scanner';
import ImportSheets from './components/ImportSheets';
import InstallPrompt from './components/InstallPrompt';

// 🔑 DEFINICIÓN DE CONTRASEÑAS
const PASSWORD_SISTEMA = 'eclipse123';
const PASSWORD_ADMIN = 'admin123';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [errorPassword, setErrorPassword] = useState(false);

  // Estados de Admin y Modal
  const [rol, setRol] = useState('EMPLEADO'); 
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [errorAdminPassword, setErrorAdminPassword] = useState(false);

  // Estado para Formulario Nuevo Producto
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newCodigo, setNewCodigo] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newPrecio, setNewPrecio] = useState('');
  const [showScanInForm, setShowScanInForm] = useState(false);

  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  // Validar contraseña de acceso general
  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === PASSWORD_SISTEMA) {
      setIsAuthenticated(true);
      setErrorPassword(false);
    } else {
      setErrorPassword(true);
    }
  };

  // Manejar intento de cambio de Rol a Admin
  const handleSelectRole = (nuevoRol) => {
    if (nuevoRol === 'ADMIN') {
      if (rol !== 'ADMIN') {
        setShowAdminModal(true);
        setAdminPasswordInput('');
        setErrorAdminPassword(false);
      }
    } else {
      setRol('EMPLEADO');
    }
  };

  // Validar contraseña de Administrador
  const handleAdminAuth = (e) => {
    e.preventDefault();
    if (adminPasswordInput === PASSWORD_ADMIN) {
      setRol('ADMIN');
      setShowAdminModal(false);
      setErrorAdminPassword(false);
      setAdminPasswordInput('');
    } else {
      setErrorAdminPassword(true);
    }
  };

  // Cargar productos e inicializar Realtime
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchProductos();

    const canal = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => {
        fetchProductos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [isAuthenticated]);

  const fetchProductos = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando productos:', error);
    } else {
      setProductos(data || []);
    }
  };

  // Guardar nuevo producto manualmente
  const handleCrearProducto = async (e) => {
    e.preventDefault();
    if (!newNombre || !newCodigo) {
      alert('Por favor completá al menos el nombre y el código de barras.');
      return;
    }

    try {
      const { error } = await supabase.from('productos').insert([
        {
          nombre: newNombre,
          codigo_barras: newCodigo,
          stock: parseInt(newStock) || 0,
          precio: parseFloat(newPrecio) || 0,
        }
      ]);

      if (error) throw error;

      alert('¡Producto creado con éxito!');
      setNewNombre('');
      setNewCodigo('');
      setNewStock('');
      setNewPrecio('');
      setShowAddModal(false);
      fetchProductos();
    } catch (err) {
      console.error('Error creando producto:', err);
      alert('Error al guardar el producto. Verificá si el código de barras ya existe.');
    }
  };

  const registrarMovimiento = async (productoId, tipo, cantidad, detalle) => {
    try {
      const { data: p } = await supabase
        .from('productos')
        .select('codigo_barras, nombre')
        .eq('id', productoId)
        .single();

      await supabase.from('movimientos').insert([{
        producto_id: productoId,
        codigo_barras: p?.codigo_barras || '',
        nombre: p?.nombre || '',
        tipo,
        cantidad,
        detalle,
        usuario: rol
      }]);
    } catch (err) {
      console.error('Error registrando movimiento:', err);
    }
  };

  const handleScan = (codigo) => {
    const prod = productos.find(p => p.codigo_barras === codigo);
    if (prod) {
      setBusqueda(codigo);
    } else {
      alert(`Código ${codigo} no encontrado en el inventario.`);
    }
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo_barras?.includes(busqueda)
  );

  // 🔒 PANTALLA DE LOGIN GENERAL
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-slate-800 border border-slate-700/80 p-8 rounded-2xl shadow-2xl w-full max-w-md text-center space-y-6">
          <div className="inline-flex p-4 bg-indigo-600/20 text-indigo-400 rounded-full border border-indigo-500/30 mb-2">
            <Lock className="w-10 h-10" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-wide flex items-center justify-center gap-2">
              🌙 Eclipse Master Cloud
            </h1>
            <p className="text-xs text-slate-400 mt-1">Ingresá la contraseña del sistema para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="password"
                placeholder="Contraseña del sistema..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 bg-slate-900 border rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none transition ${
                  errorPassword 
                    ? 'border-red-500 ring-1 ring-red-500' 
                    : 'border-slate-700 focus:ring-2 focus:ring-indigo-500'
                }`}
              />
            </div>

            {errorPassword && (
              <p className="text-xs text-red-400 text-left pl-1">
                ⚠️ Contraseña incorrecta. Intentalo de nuevo.
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition active:scale-[0.98]"
            >
              Ingresar al Sistema
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 🚀 PANTALLA PRINCIPAL
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-10 font-sans relative">
      {/* Header Top Bar */}
      <header className="bg-slate-950 text-white p-4 shadow-lg sticky top-0 z-40 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <h1 className="text-xl font-bold flex items-center gap-2 tracking-wide text-slate-100">
            🌙 Eclipse Master Cloud
          </h1>
          
          <div className="flex items-center gap-3">
            {/* Selector de Rol */}
            <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg text-xs border border-slate-800">
              <button 
                onClick={() => handleSelectRole('ADMIN')}
                className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1 transition ${rol === 'ADMIN' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                <Shield className="w-3.5 h-3.5" /> Admin
              </button>
              <button 
                onClick={() => handleSelectRole('EMPLEADO')}
                className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1 transition ${rol === 'EMPLEADO' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                <User className="w-3.5 h-3.5" /> Empleado
              </button>
            </div>

            {/* Botón Salir */}
            <button
              onClick={() => {
                setIsAuthenticated(false);
                setRol('EMPLEADO');
              }}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Barra de Búsqueda y Botón Cargar Producto */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o escanear código de barras..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl shadow-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {rol === 'ADMIN' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2 shrink-0 active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" /> Cargar Producto
            </button>
          )}
        </div>

        {/* Grid para Escáner e Importación CSV */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-5 shadow-md text-slate-200">
            <h2 className="text-md font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-400" /> Escáner de Código de Barras
            </h2>
            {Scanner && <Scanner onScan={handleScan} />}
          </div>

          {rol === 'ADMIN' && (
            <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-5 shadow-md text-slate-200">
              <h2 className="text-md font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-400" /> Importar desde Google Sheets / CSV
              </h2>
              {ImportSheets && <ImportSheets onImportSuccess={fetchProductos} />}
            </div>
          )}
        </div>

        {/* Banner Informativo de Rol */}
        <div className="bg-slate-800/80 border border-slate-700 text-slate-300 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2">
          💡 <strong className="text-slate-200">Modo {rol.toLowerCase()} activo:</strong> 
          {rol === 'ADMIN' ? ' Tenés acceso completo para gestionar el inventario e importar datos.' : ' Modo consulta y ventas activo. Para modificar stock requerís acceso Admin.'}
        </div>

        {/* Lista de Productos / Inventario */}
        <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-5 shadow-md">
          {ProductList && (
            <ProductList 
              productos={productosFiltrados} 
              rol={rol} 
              onUpdate={fetchProductos}
              registrarMovimiento={registrarMovimiento}
            />
          )}
        </div>
      </main>

      {/* 🔐 MODAL DE AUTENTICACIÓN ADMIN */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative space-y-4">
            <button 
              onClick={() => setShowAdminModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Acceso Administrador</h3>
                <p className="text-xs text-slate-400">Ingresá la clave de encargado/admin</p>
              </div>
            </div>

            <form onSubmit={handleAdminAuth} className="space-y-4 pt-2">
              <div className="relative">
                <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="Contraseña de Admin..."
                  autoFocus
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 bg-slate-900 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition ${
                    errorAdminPassword 
                      ? 'border-red-500 ring-1 ring-red-500' 
                      : 'border-slate-700 focus:ring-2 focus:ring-indigo-500'
                  }`}
                />
              </div>

              {errorAdminPassword && (
                <p className="text-xs text-red-400 pl-1">
                  ⚠️ Contraseña incorrecta.
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="w-1/2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold py-2.5 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 rounded-xl shadow transition"
                >
                  Desbloquear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📦 MODAL CARGAR PRODUCTO NUEVO */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative space-y-4">
            <button 
              onClick={() => {
                setShowAddModal(false);
                setShowScanInForm(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Nuevo Producto</h3>
                <p className="text-xs text-slate-400">Ingresá los datos o escaneá el código</p>
              </div>
            </div>

            <form onSubmit={handleCrearProducto} className="space-y-4 pt-2">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Nombre del Producto</label>
                <input
                  type="text"
                  placeholder="Ej: Galletitas Donas 150g"
                  required
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Código de Barras</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej: 779123456789"
                    required
                    value={newCodigo}
                    onChange={(e) => setNewCodigo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanInForm(!showScanInForm)}
                    className="bg-slate-700 hover:bg-slate-600 text-indigo-300 p-2.5 rounded-xl border border-slate-600 transition shrink-0"
                    title="Escanear con Cámara"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Escáner secundario adentro del formulario */}
              {showScanInForm && (
                <div className="p-3 bg-slate-900 border border-indigo-500/30 rounded-xl">
                  <Scanner onScan={(codigoScanned) => {
                    setNewCodigo(codigoScanned);
                    setShowScanInForm(false);
                  }} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">Stock Inicial</label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">Precio ($)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={newPrecio}
                    onChange={(e) => setNewPrecio(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowScanInForm(false);
                  }}
                  className="w-1/2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold py-2.5 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 rounded-xl shadow transition"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}{/* Cartel flotante de instalación */}
      <InstallPrompt />
    </div>
  );
}
    