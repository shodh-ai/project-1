// src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Header from './components/common/Header';
// import Footer from './components/Footer';
// import HomePage from './pages/HomePage';
// import AboutPage from './pages/AboutPage';
// import ContactPage from './pages/ContactPage';
// import LoginPage from './pages/LoginPage';
// import SignupPage from './pages/SignupPage';
// import DashboardPage from './pages/DashboardPage';
// import SettingsPage from './pages/SettingsPage';
// import NotFoundPage from './pages/NotFoundPage';
// import LiveKitPage from './pages/LiveKitPage';
import { AppContextProvider } from './contexts/Appcontext';
import { AuthContextProvider, useAuth } from './contexts/AuthContext'; // Import new auth context and hook
import './App.css';

const AppContent: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth(); // Use the auth hook

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  // AppContextProvider expects a string userId.
  // If user is not authenticated, user?.id might be undefined.
  // Pass a defined string (e.g., "guest_user_id") if no user is logged in.
  const contextProviderUserId = user?.id || "guest_user_id";

  return (
      // Wrap the Router (and thus the entire app) with AppContextProvider
      <AppContextProvider userId={contextProviderUserId}> 
        <Router>
          <div className="App d-flex flex-column min-vh-100">
            <Header title="Pronity" />
            <main className="flex-grow-1">
              <Routes>
                {/* <Route path="/" element={<HomePage />} /> */}
                {/* <Route path="/about" element={<AboutPage />} /> */}
                {/* <Route path="/contact" element={<ContactPage />} /> */}
                {/* <Route path="/login" element={<LoginPage />} /> */}
                {/* <Route path="/signup" element={<SignupPage />} /> */}
                
                {/* Example: Protect dashboard and settings, pass userId if needed by pages directly */}
                {/* You'd typically have proper auth protection here */}
                {/* <Route path="/dashboard" element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />} /> */}
                {/* <Route path="/settings" element={isAuthenticated ? <SettingsPage /> : <Navigate to="/login" />} /> */}
                
                {/* LiveKitPage will now be able to use useAppContext */}
                {/* <Route path="/livekit-session" element={isAuthenticated && user ? <LiveKitPage currentUserId={user.id} /> : <Navigate to="/login" />} /> */}
                
                {/* <Route path="*" element={<NotFoundPage />} /> */}
              </Routes>
            </main>
            {/* <Footer /> */}
          </div>
        </Router>
      </AppContextProvider>
    );
};

const App: React.FC = () => {
  return (
    <AuthContextProvider>
      <AppContent />
    </AuthContextProvider>
  );
};

export default App;