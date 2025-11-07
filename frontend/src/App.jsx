import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { UserAuthProvider } from './context/UserAuthContext';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BottomNav from './components/BottomNav';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import QRScannerPage from './pages/QRScannerPage';
import RestaurantListPage from './pages/RestaurantListPage';
import KitchenLoginPage from './pages/KitchenLoginPage';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import ConfirmationPage from './pages/ConfirmationPage';
import KitchenDashboard from './pages/KitchenDashboard';
import AdminPanel from './pages/AdminPanel';
import TableManagement from './pages/admin/TableManagement';
import RestaurantDetailPage from './pages/RestaurantDetailPage';
import RestaurantMenuPage from './pages/RestaurantMenuPage';
import ReservationPage from './pages/ReservationPage';
import ProfilePage from './pages/ProfilePage';
import MyReservations from './pages/MyReservations';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import UserProtectedRoute from './components/UserProtectedRoute';

function App() {
  return (
    <CartProvider>
      <AuthProvider>
        <UserAuthProvider>
          <SocketProvider>
          <Router>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/scan-qr" element={<QRScannerPage />} />
                  <Route path="/restaurants" element={<RestaurantListPage />} />
                  <Route path="/restaurant/:id" element={<RestaurantDetailPage />} />
                  <Route path="/restaurant/:id/menu" element={<RestaurantMenuPage />} />
                  <Route path="/reserve/:id" element={<ReservationPage />} />
                  <Route path="/profile" element={
                    <UserProtectedRoute>
                      <ProfilePage />
                    </UserProtectedRoute>
                  } />
                  <Route path="/my-reservations" element={
                    <UserProtectedRoute>
                      <MyReservations />
                    </UserProtectedRoute>
                  } />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/kitchen-login" element={<KitchenLoginPage />} />
                  <Route path="/menu/:tableId" element={<MenuPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/cart/:tableId" element={<CartPage />} />
                  <Route path="/confirmation/:orderId" element={<ConfirmationPage />} />
                  <Route
                    path="/kitchen"
                    element={
                      <ProtectedRoute>
                        <KitchenDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/admin" element={<AdminPanel />} />
                  <Route path="/admin/tables" element={<TableManagement />} />
                </Routes>
              </main>
              <Footer />
              <BottomNav />
            </div>
          </Router>
          </SocketProvider>
        </UserAuthProvider>
      </AuthProvider>
    </CartProvider>
  );
}

export default App;
