import React, { useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Phase 10: Auth Components
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LandingPage } from "./components/pages/LandingPage";
import { HomePage } from "./components/pages/HomePage";
import { Navigation } from "./components/layout/Navigation";
import { AuthModal } from "./components/auth/AuthModal";

// Phase 10: Tool Pages
import { ResumeBuilder } from "./components/pages/ResumeBuilder";
import { ResumeChecker } from "./components/pages/ResumeChecker";
import { CoverLetterBuilder } from "./components/pages/CoverLetterBuilder";
import { JDVerification } from "./components/pages/JDVerification";

// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading AtlasCV...</p>
    </div>
  </div>
);

// Main App component - now handles both authenticated and anonymous users
const AuthenticatedApp = ({ isAuthenticated, onAuthRequired, showAuthModal, onCloseAuthModal, authReason }) => {
  const [activeTab, setActiveTab] = useState('resume-builder');

  const renderTool = () => {
    switch (activeTab) {
      case 'resume-builder':
        return <ResumeBuilder isAuthenticated={isAuthenticated} onAuthRequired={onAuthRequired} />;
      case 'resume-checker':
        return <ResumeChecker isAuthenticated={isAuthenticated} onAuthRequired={onAuthRequired} />;
      case 'cover-letter':
        return <CoverLetterBuilder isAuthenticated={isAuthenticated} onAuthRequired={onAuthRequired} />;
      case 'jd-verification':
        return <JDVerification isAuthenticated={isAuthenticated} onAuthRequired={onAuthRequired} />;
      default:
        return <ResumeBuilder isAuthenticated={isAuthenticated} onAuthRequired={onAuthRequired} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        isAuthenticated={isAuthenticated}
        onAuthRequired={onAuthRequired}
      />
      <main>
        {renderTool()}
      </main>
      
      {/* Auth Modal for Import/Export */}
      {showAuthModal && (
        <AuthModal 
          reason={authReason}
          onClose={onCloseAuthModal}
        />
      )}
      
      <footer className="border-t bg-white/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-sm text-slate-600">
          © {new Date().getFullYear()} AtlasCV. ATS-safe builder.
          <span className="ml-4">
            <a href="#privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
            {" • "}
            <a href="#terms" className="text-blue-600 hover:underline">Terms</a>
          </span>
        </div>
      </footer>
    </div>
  );
};

// App content with auth state handling
const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authReason, setAuthReason] = useState(''); // 'import' or 'export'

  if (loading) {
    return <LoadingScreen />;
  }

  // Always show the authenticated app (resume builder), but handle auth gates within
  return (
    <AuthenticatedApp 
      isAuthenticated={isAuthenticated}
      onAuthRequired={(reason) => {
        setAuthReason(reason);
        setShowAuthModal(true);
      }}
      showAuthModal={showAuthModal}
      onCloseAuthModal={() => setShowAuthModal(false)}
      authReason={authReason}
    />
  );
};
// Main App component
function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/*" element={<AppContent />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;