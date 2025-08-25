#!/usr/bin/env python3
"""
AtlasCV Phase 8 Backend Verification Test
Specifically tests the backend functionality for live preview features
"""

import requests
import json
import uuid
from datetime import datetime

class Phase8BackendVerifier:
    def __init__(self, base_url="https://verify-complete-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.resume_id = None
        
        # Sample resume data as specified in the review request
        self.sample_resume = {
            "locale": "IN",
            "contact": {
                "full_name": "Arjun Patel",
                "email": "arjun.patel@example.com", 
                "phone": "+91 9876543210",
                "city": "Mumbai",
                "state": "Maharashtra",
                "country": "India"
            },
            "summary": "Experienced software developer with 3+ years in React and Node.js development",
            "skills": ["React", "Node.js", "JavaScript", "Python", "MongoDB", "AWS", "Git"],
            "experience": [{
                "id": str(uuid.uuid4()),
                "company": "Tech Solutions Pvt Ltd",
                "title": "Software Developer",
                "city": "Mumbai", 
                "start_date": "2022-01",
                "end_date": "Present",
                "bullets": ["Developed responsive web applications using React", "Built REST APIs with Node.js and Express"]
            }],
            "education": [{
                "id": str(uuid.uuid4()),
                "institution": "Mumbai University",
                "degree": "Bachelor of Engineering - Computer Science",
                "start_date": "2018-06",
                "end_date": "2022-05"
            }],
            "projects": [{
                "id": str(uuid.uuid4()),
                "name": "E-commerce Platform",
                "description": "Built a full-stack e-commerce application",
                "tech": ["React", "Node.js", "MongoDB"],
                "link": "https://github.com/arjun/ecommerce"
            }]
        }

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   Error text: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_basic_endpoints(self):
        """Test basic API endpoints as requested"""
        print("\n📋 TESTING BASIC API ENDPOINTS")
        print("=" * 40)
        
        # Test health check
        success, response = self.run_test("Health Check", "GET", "", 200)
        if success and response.get("message") == "AtlasCV backend up":
            print("   ✅ Health check working")
        else:
            print("   ❌ Health check failed")
            return False
        
        # Test locales endpoint
        success, response = self.run_test("Get Locales", "GET", "locales", 200)
        if success:
            locales = response.get("locales", [])
            expected_codes = {"US", "EU", "AU", "IN", "JP-R", "JP-S"}
            actual_codes = {loc.get("code") for loc in locales}
            
            if expected_codes.issubset(actual_codes):
                print("   ✅ All expected locale codes found")
            else:
                print("   ❌ Missing locale codes")
                return False
        else:
            return False
        
        # Test presets endpoint
        success, response = self.run_test("Get Presets", "GET", "presets", 200)
        if success:
            presets = response.get("presets", [])
            if len(presets) >= 6:  # Should have at least 6 presets
                print("   ✅ Presets endpoint working")
            else:
                print("   ❌ Insufficient presets returned")
                return False
        else:
            return False
        
        return True

    def test_resume_operations_for_live_preview(self):
        """Test resume operations that support Phase 8 live preview"""
        print("\n📝 TESTING RESUME OPERATIONS FOR LIVE PREVIEW")
        print("=" * 50)
        
        # Create resume with sample data
        success, response = self.run_test(
            "Create Resume (Live Preview Support)", 
            "POST", 
            "resumes", 
            200, 
            self.sample_resume
        )
        
        if not success or "id" not in response:
            print("   ❌ Resume creation failed")
            return False
        
        self.resume_id = response["id"]
        print(f"   ✅ Resume created with ID: {self.resume_id}")
        
        # Verify all fields are properly stored
        contact = response.get("contact", {})
        if contact.get("full_name") != "Arjun Patel":
            print("   ❌ Contact data not properly stored")
            return False
        
        if len(response.get("skills", [])) != 7:
            print("   ❌ Skills not properly stored")
            return False
        
        print("   ✅ All resume data properly stored")
        
        # Test retrieval (important for live preview)
        success, get_response = self.run_test(
            "Get Resume (Live Preview Retrieval)", 
            "GET", 
            f"resumes/{self.resume_id}", 
            200
        )
        
        if not success:
            return False
        
        # Verify data integrity for live preview
        if get_response.get("id") != self.resume_id:
            print("   ❌ Resume ID mismatch on retrieval")
            return False
        
        if get_response.get("summary") != self.sample_resume["summary"]:
            print("   ❌ Summary data mismatch")
            return False
        
        print("   ✅ Resume retrieval working perfectly")
        
        # Test live preview update scenario
        live_update = {
            "summary": "Updated: Experienced software developer with 3+ years in React and Node.js development, specializing in full-stack applications",
            "skills": ["React", "Node.js", "JavaScript", "Python", "MongoDB", "AWS", "Git", "TypeScript", "Docker"]
        }
        
        success, update_response = self.run_test(
            "Update Resume (Live Preview Update)", 
            "PUT", 
            f"resumes/{self.resume_id}", 
            200, 
            live_update
        )
        
        if not success:
            return False
        
        # Verify update reflects immediately (critical for live preview)
        if "Updated:" not in update_response.get("summary", ""):
            print("   ❌ Summary update not reflected")
            return False
        
        if len(update_response.get("skills", [])) != 9:
            print("   ❌ Skills update not reflected")
            return False
        
        print("   ✅ Live preview updates working correctly")
        
        # Test ATS scoring for live preview
        success, score_response = self.run_test(
            "Get ATS Score (Live Preview Scoring)", 
            "POST", 
            f"resumes/{self.resume_id}/score", 
            200
        )
        
        if not success:
            return False
        
        score = score_response.get("score")
        hints = score_response.get("hints", [])
        
        if not isinstance(score, (int, float)) or not (0 <= score <= 100):
            print("   ❌ Invalid ATS score")
            return False
        
        print(f"   ✅ ATS scoring working - Score: {score}/100, Hints: {len(hints)}")
        
        return True

    def test_jd_matching_functionality(self):
        """Test JD matching functionality"""
        print("\n🎯 TESTING JD MATCHING FUNCTIONALITY")
        print("=" * 40)
        
        # Test JD parsing
        sample_jd = """
        We are looking for a Senior Software Developer with strong experience in React and Node.js.
        The ideal candidate should have:
        - 3+ years of experience in JavaScript development
        - Proficiency in React, Node.js, and MongoDB
        - Experience with AWS cloud services
        - Knowledge of Git version control
        - Bachelor's degree in Computer Science or related field
        """
        
        success, parse_response = self.run_test(
            "Parse Job Description", 
            "POST", 
            "jd/parse", 
            200, 
            {"text": sample_jd}
        )
        
        if not success:
            return False
        
        keywords = parse_response.get("keywords", [])
        top_keywords = parse_response.get("top_keywords", [])
        
        if not keywords or not top_keywords:
            print("   ❌ JD parsing returned empty results")
            return False
        
        # Check for expected keywords
        keywords_lower = [k.lower() for k in keywords]
        expected_keywords = ["react", "node", "javascript", "mongodb", "aws", "git"]
        found_keywords = [k for k in expected_keywords if any(k in kw for kw in keywords_lower)]
        
        print(f"   📊 Found {len(keywords)} total keywords")
        print(f"   📊 Expected keywords found: {found_keywords}")
        
        if len(found_keywords) < 4:  # Should find at least 4 of the 6 expected
            print("   ❌ Too few expected keywords found")
            return False
        
        print("   ✅ JD parsing working correctly")
        
        # Test coverage analysis
        if not self.resume_id:
            print("   ❌ No resume available for coverage test")
            return False
        
        # Get the current resume for coverage test
        success, resume_response = self.run_test(
            "Get Resume for Coverage", 
            "GET", 
            f"resumes/{self.resume_id}", 
            200
        )
        
        if not success:
            return False
        
        success, coverage_response = self.run_test(
            "JD Coverage Analysis", 
            "POST", 
            "jd/coverage", 
            200, 
            {"resume": resume_response, "jd_keywords": keywords}
        )
        
        if not success:
            return False
        
        coverage_percent = coverage_response.get("coverage_percent", 0)
        matched = coverage_response.get("matched", [])
        per_section = coverage_response.get("per_section", {})
        
        if not (0 <= coverage_percent <= 100):
            print("   ❌ Invalid coverage percentage")
            return False
        
        # Verify section-wise coverage
        expected_sections = ["skills", "experience", "summary", "education", "projects"]
        for section in expected_sections:
            if section not in per_section:
                print(f"   ❌ Missing section coverage: {section}")
                return False
        
        print(f"   📊 Overall coverage: {coverage_percent}%")
        print(f"   📊 Matched keywords: {len(matched)}")
        print("   ✅ JD coverage analysis working correctly")
        
        return True

    def test_phase7_privacy_features(self):
        """Test Phase 7 privacy features that should still work"""
        print("\n🔒 TESTING PHASE 7 PRIVACY FEATURES")
        print("=" * 40)
        
        if not self.resume_id:
            print("   ❌ No resume available for privacy tests")
            return False
        
        # Test privacy info endpoint
        success, privacy_response = self.run_test(
            "Get Privacy Info", 
            "GET", 
            f"privacy/info/{self.resume_id}", 
            200
        )
        
        if not success:
            return False
        
        privacy_info = privacy_response.get("privacy_info", {})
        gdpr_rights = privacy_response.get("gdpr_rights", {})
        
        if not privacy_info.get("has_encrypted_data"):
            print("   ❌ Encryption not properly indicated")
            return False
        
        expected_rights = ["data_export", "data_deletion", "data_portability"]
        for right in expected_rights:
            if right not in gdpr_rights:
                print(f"   ❌ Missing GDPR right: {right}")
                return False
        
        print("   ✅ Privacy info endpoint working")
        
        # Test local mode settings
        local_settings = {
            "enabled": True,
            "encrypt_local_data": True,
            "auto_clear_after_hours": 24
        }
        
        success, settings_response = self.run_test(
            "Local Mode Settings", 
            "POST", 
            "local-mode/settings", 
            200, 
            local_settings
        )
        
        if not success:
            return False
        
        if not settings_response.get("local_mode"):
            print("   ❌ Local mode setting not reflected")
            return False
        
        print("   ✅ Local mode settings working")
        
        return True

    def run_verification(self):
        """Run complete Phase 8 backend verification"""
        print("🚀 AtlasCV Phase 8 Backend Verification")
        print("=" * 50)
        print("Testing backend functionality for live preview features")
        print("=" * 50)
        
        tests = [
            ("Basic API Endpoints", self.test_basic_endpoints),
            ("Resume Operations for Live Preview", self.test_resume_operations_for_live_preview),
            ("JD Matching Functionality", self.test_jd_matching_functionality),
            ("Phase 7 Privacy Features", self.test_phase7_privacy_features)
        ]
        
        passed_tests = 0
        
        for test_name, test_func in tests:
            print(f"\n🧪 {test_name}")
            print("-" * 30)
            
            if test_func():
                passed_tests += 1
                print(f"✅ {test_name} - PASSED")
            else:
                print(f"❌ {test_name} - FAILED")
        
        print("\n" + "=" * 50)
        print(f"📊 VERIFICATION RESULTS")
        print(f"📊 Tests Passed: {self.tests_passed}/{self.tests_run}")
        print(f"📊 Test Categories: {passed_tests}/{len(tests)}")
        
        if passed_tests == len(tests) and self.tests_passed == self.tests_run:
            print("🎉 ALL PHASE 8 BACKEND VERIFICATION TESTS PASSED!")
            print("✅ Backend properly supports live preview functionality")
            print("✅ Resume schema changes reflect immediately")
            print("✅ All requested endpoints working correctly")
            return True
        else:
            print("❌ Some verification tests failed")
            return False

def main():
    verifier = Phase8BackendVerifier()
    success = verifier.run_verification()
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())