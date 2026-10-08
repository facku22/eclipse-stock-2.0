import React, { useState, useEffect } from 'react';
import ProductList from './components/ProductList';
import CartSale from './components/CartSale';
import AdminProductList from './components/AdminProductList';
import ImportSheets from './components/ImportSheets';
import HistoryList from './components/HistoryList';
import Scanner from './components/Scanner';
import InstallPrompt from './components/InstallPrompt';
import { 
  ShoppingCart, 
  LayoutGrid, 
  ShieldCheck, 
  Barcode, 
  Camera, 
  X, 
  Lock, 
  LogOut, 
  KeyRound, 
  UserCheck, 
  History 
} from 'lucide-react';

const CLAVE_EMPLEADO = '2580';
const CLAVE_ADMIN = 'admin2580';

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [claveInput, setClaveInput] = useState('');
  const [errorLogin, setErrorLogin] = useState('');

  const [tabActiva, setTabActiva] = useState('pos'); // 'pos' | 'empleados' | 'admin' | 'historial'
  const [mostrarEscanerGeneral, setMostrarEscanerGeneral] = useState(false);

  useEffect(() => {
    const sesionGuardada = localStorage.getItem('eclipse_stock_sesion');
    if (sesionGuardada) {
      setUsuario(sesionGuardada);
      if (sesionGuardada === 'empleado') setTabActiva('pos');
      if (sesionGuardada === 'admin') setTabActiva('pos');
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorLogin('');

    if (claveInput === CLAVE_ADMIN) {
      setUsuario('admin');
      setTabActiva('pos');
      localStorage.setItem('eclipse_stock_sesion', 'admin');
      setClaveInput('');
    } else if (claveInput === CLAVE_EMPLEADO) {
      setUsuario('empleado');
      setTabActiva('pos');
      localStorage.setItem('eclipse_stock_sesion', 'empleado');
      setClaveInput('');
    } else {
      setErrorLogin('Contraseña incorrecta. Intente de nuevo.');
    }
  };

  const handleLogout = () => {
    setUsuario(null);
    localStorage.removeItem('eclipse_stock_sesion');
  };

  if (!usuario) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <InstallPrompt />
        <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-6 text-center">
          <div className="mx-auto w-16 h-16 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 shadow-lg">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-100">Eclipse Stock</h1>
            <p className="text-xs text-slate-400 mt-1">Ingresá tu clave de acceso para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3 w-5 h-5 text-slate-500" />
              <input
                type="password"
                placeholder="Contraseña o PIN"
                value={claveInput}
                onChange={(e) => setClaveInput(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono tracking-widest text-center text-lg"
                autoFocus
              />
            </div>

            {errorLogin && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 py-2 rounded-xl">
                {errorLogin}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30"
            >
              Ingresar al Sistema
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      <InstallPrompt />

      {/* Encabezado */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-lg text-slate-100 leading-tight">Eclipse Stock</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-emerald-400" />
                Sesión: <span className="text-indigo-400">{usuario === 'admin' ? 'Administrador' : 'Empleado'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarEscanerGeneral(true)}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-semibold transition"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Cámara</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Navegación Tabs */}
      <nav className="bg-slate-900/40 border-b border-slate-800/80 px-4">
        <div className="max-w-4xl mx-auto flex gap-2 pt-3 overflow-x-auto">
          <button
            onClick={() => setTabActiva('pos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold border-b-2 transition shrink-0 ${
              tabActiva === 'pos'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Punto de Venta (POS)
          </button>

          <button
            onClick={() => setTabActiva('empleados')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold border-b-2 transition shrink-0 ${
              tabActiva === 'empleados'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Consulta Stock
          </button>

          {usuario === 'admin' && (
            <>
              <button
                onClick={() => setTabActiva('admin')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold border-b-2 transition shrink-0 ${
                  tabActiva === 'admin'
                    ? 'border-indigo-500 text-indigo-400 bg-slate-900/80'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Administración
              </button>

              <button
                onClick={() => setTabActiva('historial')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold border-b-2 transition shrink-0 ${
                  tabActiva === 'historial'
                    ? 'border-indigo-500 text-indigo-400 bg-slate-900/80'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <History className="w-4 h-4" />
                Historial
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Contenido */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 space-y-6">
        {tabActiva === 'pos' && <CartSale />}

        {tabActiva === 'empleados' && <ProductList />}

        {tabActiva === 'admin' && usuario === 'admin' && (
          <div className="space-y-6">
            <ImportSheets />
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-slate-100">Gestión de Productos</h2>
                <p className="text-xs text-slate-400">
                  Editá datos, asigná códigos con la pistola/cámara, generá etiquetas o filtrá stock bajo.
                </p>
              </div>
              <AdminProductList />
            </div>
          </div>
        )}

        {tabActiva === 'historial' && usuario === 'admin' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-100">Historial de Ventas y Movimientos</h2>
              <p className="text-xs text-slate-400">Registro en tiempo real de cada descuento de stock.</p>
            </div>
            <HistoryList />
          </div>
        )}
      </main>

      {/* Modal Cámara */}
      {mostrarEscanerGeneral && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-100">Buscar por Cámara</h4>
              <button onClick={() => setMostrarEscanerGeneral(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <Scanner onScan={() => setMostrarEscanerGeneral(false)} />
          </div>
        </div>
      )}
    </div>
  );
}