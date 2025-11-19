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
import QRCheckPage from './pages/QRCheckPage';
import TableSelectPage from './pages/TableSelectPage';
import OrderStatusPage from './pages/OrderStatusPage';
import ReservationConfirmationPage from './pages/ReservationConfirmationPage';
import RestaurantListPage from './pages/RestaurantListPage';
import KitchenLoginPage from './pages/KitchenLoginPage';
import CartPage from './pages/CartPage';
import PaymentPage from './pages/PaymentPage';
import ConfirmationPage from './pages/ConfirmationPage';
import KitchenDashboard from './pages/KitchenDashboard';
import AdminPanel from './pages/AdminPanel';
import TableManagement from './pages/admin/TableManagement';
import MenuManagement from './pages/admin/MenuManagement'; 
import RestaurantDetailPage from './pages/RestaurantDetailPage';
import RestaurantMenuPage from './pages/RestaurantMenuPage';
import ReservationPage from './pages/ReservationPage';
import ProfilePage from './pages/ProfilePage';
import MyReservations from './pages/MyReservations';
import AdminSettings from './pages/AdminSettings';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AboutPage from './pages/AboutPage';
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
                  {/* Public Landing */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/about" element={<AboutPage />} />

                  {/* QR Code Flow */}
                  <Route path="/qr-check" element={<QRCheckPage />} />
                  <Route path="/table-select" element={<TableSelectPage />} />
                  <Route path="/scan-qr" element={<QRScannerPage />} />

                  {/* Restaurant Browsing */}
                  <Route path="/restaurants" element={<RestaurantListPage />} />
                  <Route path="/restaurant/:id" element={<RestaurantDetailPage />} />
                  <Route path="/restaurant/:id/menu" element={<RestaurantMenuPage />} />
                  <Route path="/restaurant/:id/reserve" element={<ReservationPage />} />

                  {/* Universal Order Flow */}
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/payment" element={<PaymentPage />} />
                  <Route path="/confirmation/:orderId" element={<ConfirmationPage />} />

                  {/* Order Status */}
                  <Route path="/order-status/:orderNumber" element={<OrderStatusPage />} />

                  {/* Reservation Confirmation */}
                  <Route path="/reservation-confirmation" element={<ReservationConfirmationPage />} />

                  {/* User Profile */}
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

                  {/* Auth */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />

                  {/* Kitchen & Admin */}
                  <Route path="/kitchen-login" element={<KitchenLoginPage />} />
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
                  <Route path="/admin/menu" element={<MenuManagement />} /> {/* Add route */}
                  <Route path="/admin/settings" element={<AdminSettings />} />
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
