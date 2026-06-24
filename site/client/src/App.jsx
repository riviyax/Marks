import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Home from './pages/Home';
import Account from './pages/Account';
import Checkout from './pages/Checkout';
import Download from './pages/Download';
import Admin from './pages/Admin';
import { useAuth } from './context/AuthContext';

export default function App() {
  const [loginOpen, setLoginOpen] = useState(false);
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Closes the login modal and lands the user on their account page the
  // moment sign-in completes — whether that came from the popup resolving
  // normally or from the full-page redirect fallback finishing on reload.
  useEffect(() => {
    if (firebaseUser && loginOpen) {
      setLoginOpen(false);
      if (location.pathname === '/') {
        navigate('/account');
      }
    }
  }, [firebaseUser, loginOpen, location.pathname, navigate]);

  return (
    <>
      <Navbar onOpenLogin={() => setLoginOpen(true)} />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />

      <Routes>
        <Route path="/" element={<Home onOpenLogin={() => setLoginOpen(true)} />} />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/download"
          element={
            <ProtectedRoute>
              <Download />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
      </Routes>
    </>
  );
}
