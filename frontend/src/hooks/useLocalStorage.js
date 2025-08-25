import { useState, useEffect, useCallback } from 'react';

// Simple encryption for local storage (browser-side)
const encryptData = (data, key = 'atlascv-local-key') => {
  try {
    // Simple XOR encryption for demo - in production use Web Crypto API
    const jsonStr = JSON.stringify(data);
    let encrypted = '';
    for (let i = 0; i < jsonStr.length; i++) {
      encrypted += String.fromCharCode(jsonStr.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(encrypted); // Base64 encode
  } catch (e) {
    console.error('Encryption failed:', e);
    return null;
  }
};

const decryptData = (encryptedData, key = 'atlascv-local-key') => {
  try {
    const encrypted = atob(encryptedData); // Base64 decode
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return JSON.parse(decrypted);
  } catch (e) {
    console.error('Decryption failed:', e);
    return null;
  }
};

export const useLocalStorage = (key, defaultValue = null) => {
  const [value, setValue] = useState(defaultValue);

  // Check if encryption is enabled
  const isEncryptionEnabled = () => {
    return localStorage.getItem('atlascv_encrypt_local') !== 'false';
  };

  // Load value from localStorage
  useEffect(() => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        if (isEncryptionEnabled() && key.startsWith('atlascv_')) {
          // Try to decrypt
          const decrypted = decryptData(item);
          if (decrypted !== null) {
            setValue(decrypted);
            return;
          }
        }
        // Fallback to regular JSON parse
        setValue(JSON.parse(item));
      } else {
        setValue(defaultValue);
      }
    } catch (e) {
      console.error(`Error loading ${key} from localStorage:`, e);
      setValue(defaultValue);
    }
  }, [key, defaultValue]);

  // Set value in localStorage
  const setStoredValue = useCallback((newValue) => {
    try {
      setValue(newValue);
      
      if (newValue === null || newValue === undefined) {
        localStorage.removeItem(key);
        return;
      }

      if (isEncryptionEnabled() && key.startsWith('atlascv_')) {
        // Encrypt before storing
        const encrypted = encryptData(newValue);
        if (encrypted) {
          localStorage.setItem(key, encrypted);
        } else {
          // Fallback to unencrypted
          localStorage.setItem(key, JSON.stringify(newValue));
        }
      } else {
        localStorage.setItem(key, JSON.stringify(newValue));
      }
    } catch (e) {
      console.error(`Error setting ${key} in localStorage:`, e);
    }
  }, [key]);

  return [value, setStoredValue];
};

// Hook for local-only mode
export const useLocalOnlyMode = () => {
  const [isLocalMode, setLocalMode] = useLocalStorage('atlascv_local_mode', false);
  const [localData, setLocalData] = useLocalStorage('atlascv_local_resume_data', null);
  const [autoClearHours] = useLocalStorage('atlascv_auto_clear_hours', 24);

  // Auto-clear functionality
  useEffect(() => {
    if (isLocalMode && localData) {
      const dataTimestamp = localData.lastUpdated || localData.created_at;
      if (dataTimestamp) {
        const hoursSinceUpdate = (new Date() - new Date(dataTimestamp)) / (1000 * 60 * 60);
        if (hoursSinceUpdate >= autoClearHours) {
          setLocalData(null);
          console.log('Local data auto-cleared after', autoClearHours, 'hours');
        }
      }
    }
  }, [isLocalMode, localData, autoClearHours, setLocalData]);

  const saveLocalResume = useCallback((resumeData) => {
    if (isLocalMode) {
      const timestampedData = {
        ...resumeData,
        lastUpdated: new Date().toISOString(),
        isLocalOnly: true
      };
      setLocalData(timestampedData);
      return timestampedData;
    }
    return null;
  }, [isLocalMode, setLocalData]);

  const getLocalResume = useCallback(() => {
    return isLocalMode ? localData : null;
  }, [isLocalMode, localData]);

  const clearLocalData = useCallback(() => {
    setLocalData(null);
  }, [setLocalData]);

  return {
    isLocalMode,
    setLocalMode,
    localData,
    saveLocalResume,
    getLocalResume,
    clearLocalData
  };
};