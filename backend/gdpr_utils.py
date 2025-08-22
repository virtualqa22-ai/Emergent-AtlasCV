from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
import json

class GDPRCompliance:
    """Handles GDPR compliance features"""
    
    def __init__(self, db_client):
        self.db = db_client
    
    async def export_user_data(self, user_identifier: str) -> Dict[str, Any]:
        """Export all user data for GDPR compliance"""
        try:
            # Find all resumes for this user (using email or resume_id as identifier)
            resumes = []
            
            # Search by resume ID first
            resume = await self.db.resumes.find_one({"id": user_identifier})
            if resume:
                resumes.append(resume)
            else:
                # Search by email in contact info
                cursor = self.db.resumes.find({"contact.email": user_identifier})
                async for resume in cursor:
                    resumes.append(resume)
            
            # Prepare export data
            export_data = {
                "export_timestamp": datetime.now(timezone.utc).isoformat(),
                "user_identifier": user_identifier,
                "data_categories": {
                    "resumes": len(resumes),
                    "total_records": len(resumes)
                },
                "resumes": []
            }
            
            # Add resume data (decrypt sensitive fields for export)
            from encryption_utils import privacy_encryption
            
            for resume in resumes:
                # Remove MongoDB _id for clean export
                clean_resume = {k: v for k, v in resume.items() if k != '_id'}
                
                # Decrypt sensitive data for user export
                if resume.get('_encrypted'):
                    clean_resume = privacy_encryption.decrypt_sensitive_data(clean_resume)
                
                export_data["resumes"].append(clean_resume)
            
            # Add metadata about data processing
            export_data["data_processing_info"] = {
                "purposes": [
                    "Resume creation and editing",
                    "ATS scoring and optimization", 
                    "Job description matching",
                    "Locale-specific formatting"
                ],
                "legal_basis": "User consent for service provision",
                "retention_policy": "Data retained until user requests deletion",
                "encryption_status": "Sensitive fields encrypted at rest"
            }
            
            return export_data
            
        except Exception as e:
            raise Exception(f"Failed to export user data: {str(e)}")
    
    async def delete_user_data(self, user_identifier: str, confirmation_token: Optional[str] = None) -> Dict[str, Any]:
        """Delete all user data for GDPR compliance"""
        try:
            deletion_log = {
                "deletion_timestamp": datetime.now(timezone.utc).isoformat(),
                "user_identifier": user_identifier,
                "confirmation_token": confirmation_token,
                "deleted_records": [],
                "status": "completed"
            }
            
            # Find and delete resumes by ID
            resume = await self.db.resumes.find_one({"id": user_identifier})
            if resume:
                result = await self.db.resumes.delete_one({"id": user_identifier})
                if result.deleted_count > 0:
                    deletion_log["deleted_records"].append({
                        "type": "resume",
                        "id": user_identifier,
                        "deleted_at": datetime.now(timezone.utc).isoformat()
                    })
            
            # Find and delete resumes by email
            cursor = self.db.resumes.find({"contact.email": user_identifier})
            deleted_by_email = []
            async for resume in cursor:
                deleted_by_email.append(resume["id"])
            
            if deleted_by_email:
                result = await self.db.resumes.delete_many({"contact.email": user_identifier})
                for resume_id in deleted_by_email:
                    deletion_log["deleted_records"].append({
                        "type": "resume",
                        "id": resume_id,
                        "deleted_at": datetime.now(timezone.utc).isoformat()
                    })
            
            # Log the deletion for compliance (create clean log without ObjectId)
            clean_deletion_log = {k: v for k, v in deletion_log.items()}
            await self.db.gdpr_deletions.insert_one(clean_deletion_log)
            
            deletion_log["total_deleted"] = len(deletion_log["deleted_records"])
            return deletion_log
            
        except Exception as e:
            raise Exception(f"Failed to delete user data: {str(e)}")
    
    async def get_privacy_policy_acceptance(self, user_identifier: str) -> Dict[str, Any]:
        """Get privacy policy acceptance status"""
        try:
            record = await self.db.privacy_consents.find_one({"user_identifier": user_identifier})
            
            if not record:
                return {
                    "user_identifier": user_identifier,
                    "has_consent": False,
                    "consent_date": None,
                    "consent_version": None
                }
            
            return {
                "user_identifier": user_identifier,
                "has_consent": record.get("has_consent", False),
                "consent_date": record.get("consent_date"),
                "consent_version": record.get("consent_version", "1.0"),
                "consent_types": record.get("consent_types", [])
            }
            
        except Exception as e:
            raise Exception(f"Failed to get privacy consent: {str(e)}")
    
    async def record_privacy_consent(self, user_identifier: str, consent_data: Dict[str, Any]) -> Dict[str, Any]:
        """Record user's privacy policy acceptance"""
        try:
            consent_record = {
                "user_identifier": user_identifier,
                "has_consent": consent_data.get("has_consent", True),
                "consent_date": datetime.now(timezone.utc).isoformat(),
                "consent_version": consent_data.get("version", "1.0"),
                "consent_types": consent_data.get("consent_types", ["functional", "analytics"]),
                "ip_address": consent_data.get("ip_address"),
                "user_agent": consent_data.get("user_agent"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Upsert consent record
            await self.db.privacy_consents.update_one(
                {"user_identifier": user_identifier},
                {"$set": consent_record},
                upsert=True
            )
            
            return consent_record
            
        except Exception as e:
            raise Exception(f"Failed to record privacy consent: {str(e)}")