import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { 
  FileText, 
  BadgeCheck, 
  MailOpen, 
  Search, 
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Home
} from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_aa15cf1d-5e8b-4d06-9ed0-e8d4185d0366/artifacts/r6oihf5r_AtlasCV_Logo_Transparent.png";

export const Navigation = ({ activeTab, onTabChange, isAuthenticated, onAuthRequired }) => {
  const { user, logout } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navigationItems = [
    {
      id: 'resume-builder',
      name: 'Resume Builder',
      icon: <FileText className="h-5 w-5" />,
      description: 'Build ATS-optimized resumes'
    },
    {
      id: 'resume-checker',
      name: 'Resume Checker',
      icon: <BadgeCheck className="h-5 w-5" />,
      description: 'Check ATS compatibility'
    },
    {
      id: 'cover-letter',
      name: 'Cover Letter Builder',
      icon: <MailOpen className="h-5 w-5" />,
      description: 'Create compelling cover letters'
    },
    {
      id: 'jd-verification',
      name: 'JD Verification',
      icon: <Search className="h-5 w-5" />,
      description: 'Analyze job descriptions'
    }
  ];

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50" style={{ backgroundColor: '#1D4ED8' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="AtlasCV" className="h-50 w-50" style={{ height: '200px', width: '200px' }} />
            <span className="font-bold text-xl text-white">AtlasCV</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'secondary' : 'ghost'}
                onClick={() => onTabChange(item.id)}
                className={`text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.icon}
                <span className="ml-2">{item.name}</span>
              </Button>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              className="md:hidden text-white hover:bg-white/10"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* Authentication State */}
            {isAuthenticated ? (
              /* Authenticated User Menu */
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 text-white hover:bg-white/10"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">{user?.full_name || user?.email}</span>
                </Button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b">
                        <div className="font-medium">{user?.full_name}</div>
                        <div className="text-gray-500">{user?.email}</div>
                      </div>
                      <button
                        onClick={() => {/* TODO: Settings functionality */}}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Anonymous User - Sign In Button */
              <Button
                variant="secondary"
                onClick={() => onAuthRequired('general')}
                className="bg-white/20 text-white hover:bg-white/30 border-white/20"
              >
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-white/10 backdrop-blur-sm border-t border-white/20">
          <div className="px-4 py-2 space-y-1">
            {navigationItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'secondary' : 'ghost'}
                onClick={() => {
                  onTabChange(item.id);
                  setShowMobileMenu(false);
                }}
                className={`w-full justify-start text-sm font-medium ${
                  activeTab === item.id
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.icon}
                <div className="ml-3 text-left">
                  <div>{item.name}</div>
                  <div className="text-xs opacity-70">{item.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};