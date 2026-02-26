"""
Token Encryption Service

Provides secure encryption and decryption for Amazon SP-API tokens
using Fernet symmetric encryption (AES-128-CBC with HMAC).
"""

import logging
import base64
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

logger = logging.getLogger(__name__)


class TokenEncryptionError(Exception):
    """Custom exception for token encryption errors."""
    pass


class TokenEncryptionService:
    """
    Service for encrypting and decrypting sensitive tokens.
    
    Uses Fernet symmetric encryption which provides:
    - AES-128-CBC encryption
    - HMAC-SHA256 authentication
    - Timestamp-based token expiration support
    """
    
    def __init__(self):
        self._cipher = None
        self._initialize_cipher()
    
    def _initialize_cipher(self):
        """Initialize the Fernet cipher with the encryption key."""
        key = settings.TOKEN_ENCRYPTION_KEY
        
        if not key:
            logger.warning(
                "TOKEN_ENCRYPTION_KEY not set. "
                "Using a generated key (tokens won't persist across restarts)."
            )
            key = Fernet.generate_key().decode()
        
        try:
            if isinstance(key, str):
                key = key.encode()
            
            if len(key) == 32:
                key = base64.urlsafe_b64encode(key)
            
            self._cipher = Fernet(key)
            
        except Exception as e:
            logger.error(f"Failed to initialize encryption cipher: {e}")
            raise TokenEncryptionError(
                "Invalid encryption key. Generate a new key using: "
                "python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
    
    def encrypt(self, plaintext: str) -> bytes:
        """
        Encrypt a plaintext string.
        
        Args:
            plaintext: The string to encrypt
            
        Returns:
            Encrypted bytes that can be stored in BinaryField
        """
        if not plaintext:
            raise TokenEncryptionError("Cannot encrypt empty string")
        
        try:
            encrypted = self._cipher.encrypt(plaintext.encode('utf-8'))
            return encrypted
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise TokenEncryptionError(f"Failed to encrypt token: {e}")
    
    def decrypt(self, encrypted: bytes) -> str:
        """
        Decrypt encrypted bytes back to plaintext.
        
        Args:
            encrypted: The encrypted bytes from BinaryField
            
        Returns:
            Decrypted plaintext string
        """
        if not encrypted:
            raise TokenEncryptionError("Cannot decrypt empty data")
        
        try:
            if isinstance(encrypted, memoryview):
                encrypted = bytes(encrypted)
            
            decrypted = self._cipher.decrypt(encrypted)
            return decrypted.decode('utf-8')
        except InvalidToken:
            logger.error("Invalid token or wrong encryption key")
            raise TokenEncryptionError(
                "Failed to decrypt token. The encryption key may have changed."
            )
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise TokenEncryptionError(f"Failed to decrypt token: {e}")
    
    def rotate_key(self, old_encrypted: bytes, new_cipher: 'Fernet') -> bytes:
        """
        Re-encrypt data with a new key during key rotation.
        
        Args:
            old_encrypted: Data encrypted with current key
            new_cipher: Fernet instance with new key
            
        Returns:
            Data encrypted with new key
        """
        plaintext = self.decrypt(old_encrypted)
        return new_cipher.encrypt(plaintext.encode('utf-8'))


token_encryption = TokenEncryptionService()


def generate_encryption_key() -> str:
    """
    Generate a new Fernet encryption key.
    
    Returns:
        Base64-encoded encryption key string
    """
    return Fernet.generate_key().decode()
