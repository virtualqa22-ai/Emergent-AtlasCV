import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Alert, AlertDescription } from "../ui/alert";
import { 
  Shield, 
  Download, 
  Trash2, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock,
  AlertTriangle,
  CheckCircle,
  Cookie,
  Database
} from "lucide-react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PrivacySettings = ({ resumeId, userEmail }) => {
  const [localMode, setLocalMode] = useState(false);
  const [encryptLocalData, setEncryptLocalData] = useState(true);
  const [autoClearHours, setAutoClearHours] = useState(24);
  const [cookieConsent, setCookieConsent] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [privacyInfo, setPrivacyInfo] = useState(null);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

  useEffect(() => {
    // Load local privacy settings
    const savedLocalMode = localStorage.getItem("atlascv_local_mode") === "true";
    const savedEncryption = localStorage.getItem("atlascv_encrypt_local") !== "false";
    const savedAutoClear = parseInt(localStorage.getItem("atlascv_auto_clear_hours")) || 24;
    
    setLocalMode(savedLocalMode);
    setEncryptLocalData(savedEncryption);
    setAutoClearHours(savedAutoClear);

    // Load cookie consent
    const consent = localStorage.getItem("atlascv_cookie_consent");
    if (consent) {
      try {
        setCookieConsent(JSON.parse(consent));
      } catch (e) {
        console.error("Failed to parse cookie consent");
      }
    }

    // Load privacy info if resume ID available
    if (resumeId) {
      loadPrivacyInfo();
    }
  }, [resumeId]);

  const loadPrivacyInfo = async () => {
    try {
      const response = await axios.get(`${API}/privacy/info/${resumeId}`);
      setPrivacyInfo(response.data);
    } catch (error) {
      console.error("Failed to load privacy info:", error);
    }
  };

  const updateLocalModeSettings = () => {
    localStorage.setItem("atlascv_local_mode", localMode.toString());
    localStorage.setItem("atlascv_encrypt_local", encryptLocalData.toString());
    localStorage.setItem("atlascv_auto_clear_hours", autoClearHours.toString());
    
    // Send to backend for tracking
    axios.post(`${API}/local-mode/settings`, {
      enabled: localMode,
      encrypt_local_data: encryptLocalData,
      auto_clear_after_hours: autoClearHours
    }).catch(error => console.error("Failed to update local mode settings:", error));
  };

  const exportMyData = async () => {
    if (!resumeId && !userEmail) {
      alert("No user identifier available for export");
      return;
    }

    setIsExporting(true);
    try {
      const response = await axios.post(
        `${API}/gdpr/export-my-data`,
        {
          user_identifier: resumeId || userEmail,
          format: "json"
        },
        { 
          responseType: 'blob' 
        }
      );

      // Create download
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `atlascv-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert("Your data has been exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const deleteMyData = async () => {
    if (deleteConfirmation !== "DELETE MY DATA") {
      alert("Please type 'DELETE MY DATA' to confirm deletion");
      return;
    }

    if (!resumeId && !userEmail) {
      alert("No user identifier available for deletion");
      return;
    }

    setIsDeleting(true);
    try {
      const response = await axios.post(`${API}/gdpr/delete-my-data`, {
        user_identifier: resumeId || userEmail,
        reason: "User requested data deletion"
      });

      alert(`Data deletion completed. ${response.data.total_deleted} records were deleted.`);
      
      // Clear local data too
      localStorage.removeItem("atlascv_resume_id");
      localStorage.removeItem("atlascv_local_data");
      
      // Reload the page to reflect changes
      window.location.reload();
    } catch (error) {
      console.error("Deletion failed:", error);
      alert("Failed to delete data. Please try again or contact support.");
    } finally {
      setIsDeleting(false);
      setShowDeleteWarning(false);
      setDeleteConfirmation("");
    }
  };

  const updateCookiePreferences = (newPreferences) => {
    const updatedConsent = {
      ...cookieConsent,
      preferences: newPreferences,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem("atlascv_cookie_consent", JSON.stringify(updatedConsent));
    setCookieConsent(updatedConsent);

    // Record consent with backend
    axios.post(`${API}/privacy/consent`, {
      user_identifier: resumeId || userEmail || 'anonymous',
      has_consent: true,
      version: "1.0",
      consent_types: Object.entries(newPreferences)
        .filter(([_, enabled]) => enabled)
        .map(([type, _]) => type)
    }).catch(error => console.error("Failed to record consent:", error));
  };

  return (
    <div className="space-y-6">
      {/* Local-Only Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {localMode ? <Lock className="h-5 w-5 text-green-600" /> : <Unlock className="h-5 w-5" />}
            Local-Only Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Enable Local-Only Mode</Label>
              <p className="text-xs text-gray-600">
                Work completely offline. Your resume data won't be sent to our servers.
              </p>
            </div>
            <Switch 
              checked={localMode}
              onCheckedChange={setLocalMode}
            />
          </div>

          {localMode && (
            <div className="space-y-4 pl-4 border-l-2 border-green-200">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Encrypt Local Data</Label>
                  <p className="text-xs text-gray-600">
                    Encrypt your resume data in browser storage
                  </p>
                </div>
                <Switch 
                  checked={encryptLocalData}
                  onCheckedChange={setEncryptLocalData}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Auto-clear after (hours)</Label>
                <Input
                  type="number"
                  min="1"
                  max="168"
                  value={autoClearHours}
                  onChange={(e) => setAutoClearHours(parseInt(e.target.value) || 24)}
                  className="w-20"
                />
                <p className="text-xs text-gray-600">
                  Automatically clear local data after this many hours
                </p>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Local-only mode provides maximum privacy but your data may be lost if you clear browser data or switch devices.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <Button onClick={updateLocalModeSettings} size="sm">
            Save Local Mode Settings
          </Button>
        </CardContent>
      </Card>

      {/* Cookie Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cookie className="h-5 w-5" />
            Cookie Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cookieConsent ? (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Last updated: {new Date(cookieConsent.timestamp).toLocaleDateString()}
              </div>
              
              <div className="space-y-3">
                {Object.entries(cookieConsent.preferences || {}).map(([type, enabled]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium capitalize">{type} Cookies</Label>
                      <p className="text-xs text-gray-600">
                        {type === 'functional' ? 'Required for app functionality' :
                         type === 'analytics' ? 'Help improve the app experience' :
                         'For personalized content and ads'}
                      </p>
                    </div>
                    <Switch 
                      checked={enabled}
                      disabled={type === 'functional'}
                      onCheckedChange={(checked) => {
                        const newPrefs = { ...cookieConsent.preferences, [type]: checked };
                        updateCookiePreferences(newPrefs);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              No cookie preferences set. Please accept cookies to use this feature.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Your Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Download all your personal data stored in AtlasCV in JSON format (GDPR compliant).
          </p>
          
          {privacyInfo && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <div className="font-medium text-blue-900">Privacy Status:</div>
              <div className="text-blue-700">
                Encryption: {privacyInfo.privacy_info?.encryption_status || 'Unknown'}
              </div>
              <div className="text-blue-700">
                Encrypted data: {privacyInfo.privacy_info?.has_encrypted_data ? 'Yes' : 'No'}
              </div>
            </div>
          )}

          <Button 
            onClick={exportMyData} 
            disabled={isExporting}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export My Data'}
          </Button>
        </CardContent>
      </Card>

      {/* Data Deletion */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Trash2 className="h-5 w-5" />
            Delete My Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This will permanently delete all your resume data from our servers. This action cannot be undone.
            </AlertDescription>
          </Alert>

          {!showDeleteWarning ? (
            <Button 
              onClick={() => setShowDeleteWarning(true)}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Request Data Deletion
            </Button>
          ) : (
            <div className="space-y-4 p-4 border-2 border-red-200 rounded-lg bg-red-50">
              <div className="text-sm font-medium text-red-900">
                Are you sure you want to delete all your data?
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-red-900">
                  Type "DELETE MY DATA" to confirm:
                </Label>
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE MY DATA"
                  className="border-red-300"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={deleteMyData}
                  disabled={isDeleting || deleteConfirmation !== "DELETE MY DATA"}
                  variant="destructive"
                  size="sm"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Deletion'}
                </Button>
                <Button 
                  onClick={() => {
                    setShowDeleteWarning(false);
                    setDeleteConfirmation("");
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacySettings;