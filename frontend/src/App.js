import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Datas from './pages/Datas';
import Logs from './pages/Logs';
import VisitorPage from './pages/VisitorPage';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import { VisitorProvider } from './context/VisitorContext';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import PageTransition from './components/PageTransition';
import Layout from './components/Layout';
import './App.css';

const AppRoutes = () => {
  const location = useLocation();
  
  return (
    <Routes location={location}>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/*"
        element={
          <Layout>
            <PageTransition>
              <Routes location={location}>
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/datas"
                  element={
                    <PrivateRoute>
                      <Datas />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/logs"
                  element={
                    <PrivateRoute>
                      <Logs />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/visitors/:pdlId"
                  element={
                    <PrivateRoute>
                      <VisitorPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <PrivateRoute>
                      <Settings />
                    </PrivateRoute>
                  }
                />
              </Routes>
            </PageTransition>
          </Layout>
        }
      />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <VisitorProvider>
        <Router>
          <AppRoutes />
        </Router>
      </VisitorProvider>
    </AuthProvider>
  );
};

export default App;
