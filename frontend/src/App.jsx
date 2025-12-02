import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { UserAuthProvider } from './context/UserAuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BottomNav from './components/BottomNav';
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
      <UserAuthProvider>
        <SocketProvider>
          <Router>
            <div className="flex flex-col min-h-screen relative">
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

                  {/* PROTECTED ADMIN ROUTES */}
                  <Route path="/admin" element={
                    <RoleRoute allowedRoles={['developer', 'owner']}>
                      <AdminPanel />
                    </RoleRoute>
                  } />
                  <Route path="/admin/tables" element={
                    <RoleRoute allowedRoles={['developer', 'owner']}>
                      <TableManagement />
                    </RoleRoute>
                  } />
                  <Route path="/admin/menu" element={
                    <RoleRoute allowedRoles={['developer', 'owner']}>
                      <MenuManagement />
                    </RoleRoute>
                  } />
                  <Route path="/admin/settings" element={
                    <RoleRoute allowedRoles={['developer', 'owner']}>
                      <AdminSettings />
                    </RoleRoute>
                  } />

                  {/* PROTECTED KITCHEN ROUTES */}
                  <Route path="/kitchen" element={
                    <RoleRoute allowedRoles={['developer', 'owner', 'employee']}>
                      <KitchenDashboard />
                    </RoleRoute>
                  } />

                </Routes>
              </main>
              <Footer />
              <BottomNav />
            </div>
          </Router>
        </SocketProvider>
      </UserAuthProvider>
    </CartProvider>
  );
}

export default App;
