from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os
from typing import Any, Dict, List, Optional
import json

class PrivacyEncryption:
    """Handles field-level encryption for sensitive resume data"""
    
    def __init__(self):
        # Get encryption key from environment or generate one
        self.encryption_key = self._get_or_create_key()
        self.fernet = Fernet(self.encryption_key)
        
        # Define which fields need encryption
        self.sensitive_fields = {
            'contact.full_name',
            'contact.email', 
            'contact.phone',
            'contact.linkedin',
            'contact.website'
        }
    
    def _get_or_create_key(self) -> bytes:
        """Get encryption key from environment or generate new one"""
        key_str = os.environ.get('RESUME_ENCRYPTION_KEY')
        if key_str:
            return key_str.encode()
        
        # Generate new key - in production this should be stored securely
        password = os.environ.get('ENCRYPTION_PASSWORD', 'atlascv-default-password').encode()
        salt = os.environ.get('ENCRYPTION_SALT', 'atlascv-salt').encode()
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password))
        return key
    
    def encrypt_sensitive_data(self, resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """Encrypt sensitive fields in resume data"""
        if not resume_data:
            return resume_data
            
        encrypted_data = resume_data.copy()
        
        # Encrypt contact information
        if 'contact' in encrypted_data:
            contact = encrypted_data['contact'].copy()
            
            if contact.get('full_name'):
                contact['full_name'] = self._encrypt_field(contact['full_name'])
            if contact.get('email'):
                contact['email'] = self._encrypt_field(contact['email'])
            if contact.get('phone'):
                contact['phone'] = self._encrypt_field(contact['phone'])
            if contact.get('linkedin'):
                contact['linkedin'] = self._encrypt_field(contact['linkedin'])
            if contact.get('website'):
                contact['website'] = self._encrypt_field(contact['website'])
                
            encrypted_data['contact'] = contact
        
        # Mark as encrypted for identification
        encrypted_data['_encrypted'] = True
        return encrypted_data
    
    def decrypt_sensitive_data(self, resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """Decrypt sensitive fields in resume data"""
        if not resume_data or not resume_data.get('_encrypted'):
            return resume_data
            
        decrypted_data = resume_data.copy()
        
        # Decrypt contact information
        if 'contact' in decrypted_data:
            contact = decrypted_data['contact'].copy()
            
            if contact.get('full_name') and self._is_encrypted(contact['full_name']):
                contact['full_name'] = self._decrypt_field(contact['full_name'])
            if contact.get('email') and self._is_encrypted(contact['email']):
                contact['email'] = self._decrypt_field(contact['email'])
            if contact.get('phone') and self._is_encrypted(contact['phone']):
                contact['phone'] = self._decrypt_field(contact['phone'])
            if contact.get('linkedin') and self._is_encrypted(contact['linkedin']):
                contact['linkedin'] = self._decrypt_field(contact['linkedin'])
            if contact.get('website') and self._is_encrypted(contact['website']):
                contact['website'] = self._decrypt_field(contact['website'])
                
            decrypted_data['contact'] = contact
        
        # Remove encryption marker
        decrypted_data.pop('_encrypted', None)
        return decrypted_data
    
    def _encrypt_field(self, value: str) -> str:
        """Encrypt a single field value"""
        if not value or not isinstance(value, str):
            return value
        return f"ENC:{self.fernet.encrypt(value.encode()).decode()}"
    
    def _decrypt_field(self, value: str) -> str:
        """Decrypt a single field value"""
        if not value or not isinstance(value, str) or not value.startswith('ENC:'):
            return value
        try:
            encrypted_bytes = value[4:].encode()  # Remove 'ENC:' prefix
            return self.fernet.decrypt(encrypted_bytes).decode()
        except Exception:
            # If decryption fails, return original value
            return value
    
    def _is_encrypted(self, value: str) -> bool:
        """Check if a field value is encrypted"""
        return isinstance(value, str) and value.startswith('ENC:')
    
    def get_privacy_info(self, resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get privacy information about stored data"""
        return {
            'has_encrypted_data': resume_data.get('_encrypted', False),
            'sensitive_fields_count': len(self.sensitive_fields),
            'encryption_status': 'enabled' if self.encryption_key else 'disabled'
        }

# Global instance
privacy_encryption = PrivacyEncryption()