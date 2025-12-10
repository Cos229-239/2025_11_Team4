import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './context/SocketProvider';
import { UserAuthProvider } from './context/UserAuthProvider';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BottomNav from './components/BottomNav';
import ConfirmModal from './components/common/ConfirmModal';
import RoleRoute from './components/RoleRoute';
import LandingPage from './pages/LandingPage';
import QRScannerPage from './pages/QRScannerPage';
import QRCheckPage from './pages/QRCheckPage';
import TableSelectPage from './pages/TableSelectPage';
import OrderStatusPage from './pages/OrderStatusPage';
import ReservationConfirmationPage from './pages/ReservationConfirmationPage';
import RestaurantListPage from './pages/RestaurantListPage';
import CartPage from './pages/CartPage';
import PaymentPage from './pages/PaymentPage';
import ConfirmationPage from './pages/ConfirmationPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import KitchenDashboard from './pages/KitchenDashboard';
import OwnerDashboard from './pages/admin/OwnerDashboard';
import RestaurantDetailPage from './pages/RestaurantDetailPage';
import RestaurantMenuPage from './pages/RestaurantMenuPage';
import ReservationPage from './pages/ReservationPage';
import ProfilePage from './pages/ProfilePage';
import MyReservations from './pages/MyReservations';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import AboutPage from './pages/AboutPage';
import UserProtectedRoute from './components/UserProtectedRoute';

const AppContent = () => {
  const location = useLocation();
  // Check if current route is an admin/dashboard route
  const isAdminRoute = location.pathname.startsWith('/owner') || location.pathname.startsWith('/kitchen');

  return (
    <div className={`flex flex-col min-h-screen relative ${isAdminRoute ? 'bg-black' : ''}`}>
      {!isAdminRoute && <Navbar />}

      <main className={isAdminRoute ? 'h-screen overflow-hidden' : 'flex-grow'}>
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
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
          <Route path="/confirmation/:orderId" element={<ConfirmationPage />} />
          <Route path="/order-status/:orderNumber" element={<OrderStatusPage />} />
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
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* PROTECTED KITCHEN ROUTES */}
          <Route path="/kitchen" element={
            <RoleRoute allowedRoles={['developer', 'owner', 'employee']}>
              <KitchenDashboard />
            </RoleRoute>
          } />

          {/* OWNER PORTAL */}
          <Route path="/owner" element={
            <RoleRoute allowedRoles={['developer', 'owner']}>
              <OwnerDashboard />
            </RoleRoute>
          } />

        </Routes>
      </main>

      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <BottomNav />}
      <ConfirmModal />
      <Toaster position="top-right" />
    </div>
  );
};

function App() {
  return (
    <UserAuthProvider>
      <SocketProvider>
        <Router>
          <AppContent />
        </Router>
      </SocketProvider>
    </UserAuthProvider>
  );
}

export default App;
