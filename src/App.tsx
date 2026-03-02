import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Login } from './pages/Login';
import Layout from './Layout'; // O Layout mestre

// Lazy Loading das páginas
const Home = lazy(() => import('./pages/Home'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const Department = lazy(() => import('./pages/Department'));
const FormView = lazy(() => import('./pages/FormView'));

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
          
          {/* Rota Protegida Mestra (O Layout envolve TUDO) */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            
            {/* Se acessar a raiz "/", carrega a página Home */}
            <Route index element={
              <Suspense fallback={<LoadingScreen />}><Home /></Suspense>
            } />
            
            <Route path="dept/:deptId" element={<Suspense fallback={<LoadingScreen />}><Department /></Suspense>} />
            
            {/* Se aceder a um formulário, carrega a FormView */}
            <Route path="form/:deptId/:submoduleId" element={
              <Suspense fallback={<LoadingScreen />}><FormView /></Suspense>
            } />
            
            {/* Rota do Admin */}
            <Route path="admin" element={
              <Suspense fallback={<LoadingScreen />}><AdminPage /></Suspense>
            } />

            {/* Redirecionamento de segurança: se digitar uma URL que não existe, volta pra Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
            
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;