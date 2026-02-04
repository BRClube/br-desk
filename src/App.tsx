import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// --- IMPORTAÇÃO CONVENCIONAL (Login é público e leve) ---
import { Login } from './pages/Login';
import Layout from '../src/Layout'; // Layout precisa estar disponível para o AdminPage também

// --- LAZY LOADING (O Segredo da Segurança) ---
// O React só vai baixar esses arquivos (e as URLs dentro deles)
// DEPOIS que o usuário fizer login e tentar acessar a rota.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

// Componente de "Carregando..." enquanto baixa o código
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Carregando Sistema...</p>
    </div>
  </div>
);

const App = () => {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Routes>
          {/* Rota Pública */}
          <Route path="/login" element={<Login />} />
          
          {/* Rotas Protegidas (Só acessa se estiver logado) */}
          
          {/* Rota de Admin */}
          <Route path="/admin" element={
            <ProtectedRoute>
               {/* Layout vazio para o AdminPage se ele precisar de estrutura, ou apenas o componente */}
               <Layout activeDept="home" activeSubmodule={null} onNavigate={() => {}}>
                  <Suspense fallback={<LoadingScreen />}>
                    <AdminPage />
                  </Suspense>
               </Layout>
            </ProtectedRoute>
          } />

          {/* Rota Principal (Dashboard) */}
          <Route path="/*" element={
            <ProtectedRoute>
              {/* O Suspense é obrigatório quando usamos lazy() */}
              <Suspense fallback={<LoadingScreen />}>
                <Dashboard />
              </Suspense>
            </ProtectedRoute>
          } />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;