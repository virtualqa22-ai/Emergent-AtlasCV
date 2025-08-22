import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Shield, Cookie, Settings, X } from "lucide-react";

const CookieConsentBanner = ({ onConsentChange }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    functional: true, // Always required
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    // Check if user has already given consent
    const consent = localStorage.getItem("atlascv_cookie_consent");
    if (!consent) {
      setIsVisible(true);
    } else {
      try {
        const consentData = JSON.parse(consent);
        setPreferences(consentData.preferences);
        if (onConsentChange) {
          onConsentChange(consentData);
        }
      } catch (e) {
        setIsVisible(true);
      }
    }
  }, [onConsentChange]);

  const saveConsent = (acceptAll = false) => {
    const finalPreferences = acceptAll
      ? { functional: true, analytics: true, marketing: true }
      : preferences;

    const consentData = {
      timestamp: new Date().toISOString(),
      version: "1.0",
      preferences: finalPreferences,
      ip_address: null, // Would be filled by backend
      user_agent: navigator.userAgent
    };

    localStorage.setItem("atlascv_cookie_consent", JSON.stringify(consentData));
    setIsVisible(false);

    if (onConsentChange) {
      onConsentChange(consentData);
    }
  };

  const handlePreferenceChange = (type, value) => {
    if (type === 'functional') return; // Functional cookies always required
    setPreferences(prev => ({ ...prev, [type]: value }));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/50 to-transparent">
      <Card className="mx-auto max-w-4xl border border-blue-200 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Cookie className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                🍪 Privacy & Cookies
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                We use cookies to enhance your resume building experience. Functional cookies are required for the app to work. 
                You can choose whether to allow analytics and marketing cookies.
              </p>

              {showDetails && (
                <div className="mb-4 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Functional Cookies</h4>
                      <p className="text-xs text-gray-600">Required for resume saving, templates, and core features</p>
                    </div>
                    <div className="text-sm font-medium text-blue-600">Required</div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Analytics Cookies</h4>
                      <p className="text-xs text-gray-600">Help us understand how you use AtlasCV to improve the experience</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={preferences.analytics}
                        onChange={(e) => handlePreferenceChange('analytics', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Marketing Cookies</h4>
                      <p className="text-xs text-gray-600">Used to show relevant content and ads (if any)</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={preferences.marketing}
                        onChange={(e) => handlePreferenceChange('marketing', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => saveConsent(true)} 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Accept All
                </Button>
                <Button 
                  onClick={() => saveConsent(false)} 
                  variant="outline"
                  className="border-gray-300"
                >
                  Save Preferences
                </Button>
                <Button 
                  onClick={() => setShowDetails(!showDetails)} 
                  variant="ghost"
                  size="sm"
                  className="text-gray-600"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  {showDetails ? 'Hide Details' : 'Customize'}
                </Button>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                By using AtlasCV, you agree to our{' '}
                <a href="#privacy" className="text-blue-600 hover:underline">Privacy Policy</a> and{' '}
                <a href="#terms" className="text-blue-600 hover:underline">Terms of Service</a>.
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CookieConsentBanner;