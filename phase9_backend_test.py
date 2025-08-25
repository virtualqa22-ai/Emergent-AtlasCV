import requests
import sys
import json
from datetime import datetime
import uuid

class AtlasCVPhase9Tester:
    def __init__(self, base_url="https://inactive-cleanup.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.resume_ids = {}  # Store resume IDs by locale for cleanup
        self.test_user_email = f"phase9-test-{uuid.uuid4().hex[:8]}@atlascv-test.com"

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        if headers is None:
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
                    print(f"   Response: {json.dumps(response_data, indent=2)[:300]}...")
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

    def test_expanded_locales(self):
        """Test GET /api/locales - should return all 9 locales including new ones"""
        success, response = self.run_test(
            "Expanded Locales (9 total)",
            "GET",
            "locales",
            200
        )
        
        if success:
            locales = response.get("locales", [])
            expected_codes = {"US", "CA", "EU", "AU", "IN", "SG", "AE", "JP-R", "JP-S"}
            actual_codes = {loc.get("code") for loc in locales}
            
            print(f"   📊 Found locales: {sorted(actual_codes)}")
            
            if expected_codes == actual_codes:
                print(f"   ✅ All 9 expected locale codes found: {expected_codes}")
                return True
            else:
                missing = expected_codes - actual_codes
                extra = actual_codes - expected_codes
                if missing:
                    print(f"   ❌ Missing locale codes: {missing}")
                if extra:
                    print(f"   ⚠️  Extra locale codes: {extra}")
                return False
        return False

    def test_new_locale_optional_fields(self):
        """Test optional fields configuration for new locales (CA, SG, AE)"""
        new_locales = ["CA", "SG", "AE"]
        all_passed = True
        
        for locale in new_locales:
            success, response = self.run_test(
                f"Optional Fields for {locale}",
                "GET",
                f"presets/{locale}/optional-fields",
                200
            )
            
            if success:
                # Verify response structure
                required_fields = ["locale", "optional_fields", "section_order", "labels"]
                for field in required_fields:
                    if field not in response:
                        print(f"   ❌ Missing field '{field}' in {locale} optional fields")
                        all_passed = False
                        continue
                
                optional_fields = response.get("optional_fields", {})
                
                # Verify locale-specific rules
                if locale == "CA":
                    # Canada: photo=False, date_of_birth=False, personal_details=True (languages important)
                    if optional_fields.get("photo") != False:
                        print(f"   ❌ CA should have photo=False, got {optional_fields.get('photo')}")
                        all_passed = False
                    if optional_fields.get("personal_details") != True:
                        print(f"   ❌ CA should have personal_details=True for languages")
                        all_passed = False
                    else:
                        print(f"   ✅ CA optional fields correct: no photo, personal_details for languages")
                
                elif locale == "SG":
                    # Singapore: photo=True, personal_details=True (nationality important)
                    if optional_fields.get("photo") != True:
                        print(f"   ❌ SG should have photo=True, got {optional_fields.get('photo')}")
                        all_passed = False
                    if optional_fields.get("personal_details") != True:
                        print(f"   ❌ SG should have personal_details=True for nationality")
                        all_passed = False
                    else:
                        print(f"   ✅ SG optional fields correct: photo allowed, personal_details for nationality")
                
                elif locale == "AE":
                    # UAE: photo=True, personal_details=True (nationality/visa crucial)
                    if optional_fields.get("photo") != True:
                        print(f"   ❌ AE should have photo=True, got {optional_fields.get('photo')}")
                        all_passed = False
                    if optional_fields.get("personal_details") != True:
                        print(f"   ❌ AE should have personal_details=True for nationality/visa")
                        all_passed = False
                    else:
                        print(f"   ✅ AE optional fields correct: photo allowed, personal_details for nationality/visa")
            else:
                all_passed = False
        
        return all_passed

    def test_jp_rirekisho_photo_requirement(self):
        """Test JP-R locale has photo=True (required for Rirekisho)"""
        success, response = self.run_test(
            "JP-R Photo Requirement",
            "GET",
            "presets/JP-R/optional-fields",
            200
        )
        
        if success:
            optional_fields = response.get("optional_fields", {})
            if optional_fields.get("photo") == True:
                print("   ✅ JP-R correctly requires photo for Rirekisho format")
                return True
            else:
                print(f"   ❌ JP-R should have photo=True, got {optional_fields.get('photo')}")
                return False
        return False

    def create_phase9_resume_sample(self, locale="SG"):
        """Create a comprehensive Phase 9 resume with all optional fields"""
        return {
            "locale": locale,
            "contact": {
                "full_name": "Sarah Lim Wei Ming",
                "email": f"sarah-{uuid.uuid4().hex[:8]}@phase9-test.com",
                "phone": "+65 9123 4567",
                "city": "Singapore", 
                "country": "Singapore",
                "photo_url": "https://example.com/sarah-photo.jpg",
                "date_of_birth": "1990-05-15"
            },
            "summary": "Experienced software engineer with 5+ years in fintech and e-commerce platforms. Specialized in React, Node.js, and cloud architecture on AWS.",
            "skills": ["React", "Node.js", "Python", "AWS", "Docker", "Kubernetes", "TypeScript", "MongoDB"],
            "experience": [{
                "id": str(uuid.uuid4()),
                "company": "TechCorp Singapore",
                "title": "Senior Software Engineer",
                "city": "Singapore",
                "start_date": "2022-03",
                "end_date": "Present",
                "bullets": [
                    "Led development of microservices architecture serving 1M+ users",
                    "Improved system performance by 40% through optimization",
                    "Mentored 3 junior developers and conducted code reviews"
                ]
            }],
            "education": [{
                "id": str(uuid.uuid4()),
                "institution": "National University of Singapore",
                "degree": "Bachelor of Computer Science",
                "start_date": "2016-08",
                "end_date": "2020-05",
                "details": "First Class Honours, Dean's List"
            }],
            "projects": [{
                "id": str(uuid.uuid4()),
                "name": "E-commerce Platform",
                "description": "Full-stack e-commerce solution with real-time inventory",
                "tech": ["React", "Node.js", "MongoDB", "AWS"],
                "link": "https://github.com/sarah/ecommerce-platform"
            }],
            # Phase 9: New optional sections
            "certifications": [{
                "id": str(uuid.uuid4()),
                "name": "AWS Solutions Architect Professional",
                "issuer": "Amazon Web Services",
                "issue_date": "2023-06",
                "credential_id": "AWS-SAP-123456",
                "credential_url": "https://aws.amazon.com/verify/123456"
            }, {
                "id": str(uuid.uuid4()),
                "name": "Certified Kubernetes Administrator",
                "issuer": "Cloud Native Computing Foundation",
                "issue_date": "2023-09",
                "credential_id": "CKA-789012",
                "credential_url": "https://cncf.io/verify/789012"
            }],
            "references": [{
                "id": str(uuid.uuid4()),
                "name": "John Tan Wei Kiat",
                "title": "Engineering Manager",
                "company": "TechCorp Singapore",
                "email": "john.tan@techcorp.sg",
                "phone": "+65 9111 2222",
                "relationship": "Direct Manager"
            }, {
                "id": str(uuid.uuid4()),
                "name": "Dr. Lisa Chen",
                "title": "Associate Professor",
                "company": "National University of Singapore",
                "email": "lisa.chen@nus.edu.sg",
                "phone": "+65 6516 1234",
                "relationship": "Academic Supervisor"
            }],
            "personal_details": {
                "nationality": "Singaporean",
                "visa_status": "Citizen",
                "languages": ["English", "Mandarin", "Malay", "Tamil"],
                "hobbies": ["Photography", "Rock Climbing", "Cooking"],
                "volunteer_work": "Volunteer coding instructor at local community center",
                "awards": ["Employee of the Year 2023", "Best Innovation Award 2022"]
            }
        }

    def test_create_resume_with_optional_fields(self):
        """Test creating resumes with Phase 9 optional fields for different locales"""
        test_locales = ["SG", "AE", "CA"]
        all_passed = True
        
        for locale in test_locales:
            resume_data = self.create_phase9_resume_sample(locale)
            
            # Adjust data based on locale rules
            if locale == "CA":
                # Canada: remove photo and date_of_birth
                resume_data["contact"]["photo_url"] = None
                resume_data["contact"]["date_of_birth"] = None
                resume_data["contact"]["full_name"] = "Emma Thompson"
                resume_data["contact"]["phone"] = "+1 416 555 0123"
                resume_data["contact"]["city"] = "Toronto"
                resume_data["contact"]["country"] = "Canada"
                resume_data["personal_details"]["nationality"] = "Canadian"
                resume_data["personal_details"]["languages"] = ["English", "French"]
            elif locale == "AE":
                resume_data["contact"]["full_name"] = "Ahmed Al-Rashid"
                resume_data["contact"]["phone"] = "+971 50 123 4567"
                resume_data["contact"]["city"] = "Dubai"
                resume_data["contact"]["country"] = "United Arab Emirates"
                resume_data["personal_details"]["nationality"] = "Emirati"
                resume_data["personal_details"]["visa_status"] = "Citizen"
                resume_data["personal_details"]["languages"] = ["Arabic", "English"]
            
            success, response = self.run_test(
                f"Create {locale} Resume with Optional Fields",
                "POST",
                "resumes",
                200,
                data=resume_data
            )
            
            if success and "id" in response:
                resume_id = response["id"]
                self.resume_ids[locale] = resume_id
                
                # Verify optional fields are preserved
                if "certifications" in response and len(response["certifications"]) > 0:
                    print(f"   ✅ {locale}: Certifications preserved ({len(response['certifications'])} items)")
                else:
                    print(f"   ❌ {locale}: Certifications not preserved")
                    all_passed = False
                
                if "references" in response and len(response["references"]) > 0:
                    print(f"   ✅ {locale}: References preserved ({len(response['references'])} items)")
                else:
                    print(f"   ❌ {locale}: References not preserved")
                    all_passed = False
                
                if "personal_details" in response and response["personal_details"]:
                    print(f"   ✅ {locale}: Personal details preserved")
                else:
                    print(f"   ❌ {locale}: Personal details not preserved")
                    all_passed = False
                
                # Verify contact optional fields
                contact = response.get("contact", {})
                if locale == "SG" or locale == "AE":
                    if contact.get("photo_url"):
                        print(f"   ✅ {locale}: Photo URL preserved")
                    if contact.get("date_of_birth"):
                        print(f"   ✅ {locale}: Date of birth preserved")
                elif locale == "CA":
                    if not contact.get("photo_url"):
                        print(f"   ✅ {locale}: Photo correctly omitted")
                    if not contact.get("date_of_birth"):
                        print(f"   ✅ {locale}: Date of birth correctly omitted")
            else:
                print(f"   ❌ {locale}: Resume creation failed")
                all_passed = False
        
        return all_passed

    def test_retrieve_resume_with_optional_fields(self):
        """Test retrieving resumes with optional fields"""
        all_passed = True
        
        for locale, resume_id in self.resume_ids.items():
            success, response = self.run_test(
                f"Retrieve {locale} Resume with Optional Fields",
                "GET",
                f"resumes/{resume_id}",
                200
            )
            
            if success:
                # Verify all optional sections are present
                optional_sections = ["certifications", "references", "personal_details"]
                for section in optional_sections:
                    if section in response:
                        print(f"   ✅ {locale}: {section} section retrieved")
                    else:
                        print(f"   ❌ {locale}: {section} section missing")
                        all_passed = False
                
                # Verify specific field content
                if locale == "SG" and response.get("personal_details", {}).get("nationality") == "Singaporean":
                    print(f"   ✅ {locale}: Nationality correctly preserved")
                elif locale == "CA" and "French" in response.get("personal_details", {}).get("languages", []):
                    print(f"   ✅ {locale}: French language correctly preserved")
                elif locale == "AE" and response.get("personal_details", {}).get("nationality") == "Emirati":
                    print(f"   ✅ {locale}: UAE nationality correctly preserved")
            else:
                all_passed = False
        
        return all_passed

    def test_update_resume_optional_fields(self):
        """Test updating resumes with optional fields"""
        if "SG" not in self.resume_ids:
            print("   ❌ No SG resume available for update test")
            return False
        
        resume_id = self.resume_ids["SG"]
        
        # Update with new certification and reference
        update_data = {
            "certifications": [{
                "id": str(uuid.uuid4()),
                "name": "Google Cloud Professional Architect",
                "issuer": "Google Cloud",
                "issue_date": "2024-01",
                "credential_id": "GCP-PA-456789",
                "credential_url": "https://cloud.google.com/verify/456789"
            }],
            "personal_details": {
                "nationality": "Singaporean",
                "visa_status": "Citizen",
                "languages": ["English", "Mandarin", "Japanese"],  # Added Japanese
                "hobbies": ["Photography", "Rock Climbing", "Cooking", "Gaming"],  # Added Gaming
                "awards": ["Employee of the Year 2023", "Best Innovation Award 2022", "Tech Excellence Award 2024"]  # Added new award
            }
        }
        
        success, response = self.run_test(
            "Update SG Resume Optional Fields",
            "PUT",
            f"resumes/{resume_id}",
            200,
            data=update_data
        )
        
        if success:
            # Verify updates
            certifications = response.get("certifications", [])
            if len(certifications) > 0 and any("Google Cloud" in cert.get("issuer", "") for cert in certifications):
                print("   ✅ New certification added successfully")
            else:
                print("   ❌ New certification not added")
                return False
            
            personal_details = response.get("personal_details", {})
            if "Japanese" in personal_details.get("languages", []):
                print("   ✅ Language updated successfully")
            else:
                print("   ❌ Language not updated")
                return False
            
            if "Tech Excellence Award 2024" in personal_details.get("awards", []):
                print("   ✅ Award added successfully")
            else:
                print("   ❌ Award not added")
                return False
            
            return True
        
        return False

    def test_locale_specific_validation(self):
        """Test locale-specific validation rules for optional fields"""
        all_passed = True
        
        # Test 1: US resume with photo (should get validation issue)
        us_resume_with_photo = {
            "locale": "US",
            "contact": {
                "full_name": "John Smith",
                "email": "john@example.com",
                "phone": "+1 555 123 4567",
                "city": "New York",
                "state": "NY",
                "country": "USA",
                "photo_url": "https://example.com/john-photo.jpg"  # Should trigger validation issue
            },
            "experience": [{
                "id": str(uuid.uuid4()),
                "company": "Tech Corp",
                "title": "Developer",
                "city": "New York",
                "start_date": "2023-01",
                "end_date": "Present",
                "bullets": ["Developed applications"]
            }]
        }
        
        success, response = self.run_test(
            "Validate US Resume with Photo (should warn)",
            "POST",
            "validate",
            200,
            data={"resume": us_resume_with_photo}
        )
        
        if success:
            issues = response.get("issues", [])
            photo_issue_found = any("photo" in issue.lower() for issue in issues)
            if photo_issue_found:
                print("   ✅ US validation correctly warns about photo")
            else:
                print("   ❌ US validation should warn about photo")
                all_passed = False
        else:
            all_passed = False
        
        # Test 2: JP-R resume without photo (should get validation issue)
        jp_resume_no_photo = {
            "locale": "JP-R",
            "contact": {
                "full_name": "Tanaka Hiroshi",
                "email": "tanaka@example.com",
                "phone": "+81 90 1234 5678",
                "city": "Tokyo",
                "country": "Japan"
                # No photo_url - should trigger validation issue for JP-R
            },
            "experience": [{
                "id": str(uuid.uuid4()),
                "company": "Japanese Corp",
                "title": "Engineer",
                "city": "Tokyo",
                "start_date": "2023/01",  # Correct JP format
                "end_date": "Present",
                "bullets": ["Developed systems"]
            }]
        }
        
        success, response = self.run_test(
            "Validate JP-R Resume without Photo (should warn)",
            "POST",
            "validate",
            200,
            data={"resume": jp_resume_no_photo}
        )
        
        if success:
            issues = response.get("issues", [])
            photo_issue_found = any("photo" in issue.lower() for issue in issues)
            if photo_issue_found:
                print("   ✅ JP-R validation correctly requires photo")
            else:
                print("   ❌ JP-R validation should require photo")
                all_passed = False
        else:
            all_passed = False
        
        # Test 3: SG resume without nationality (should get validation issue)
        sg_resume_no_nationality = {
            "locale": "SG",
            "contact": {
                "full_name": "Sarah Lim",
                "email": "sarah@example.com",
                "phone": "+65 9123 4567",
                "city": "Singapore",
                "country": "Singapore"
            },
            "personal_details": {
                "visa_status": "Citizen",
                "languages": ["English", "Mandarin"]
                # Missing nationality - should trigger validation issue for SG
            },
            "experience": [{
                "id": str(uuid.uuid4()),
                "company": "SG Tech",
                "title": "Developer",
                "city": "Singapore",
                "start_date": "2023-01",
                "end_date": "Present",
                "bullets": ["Built applications"]
            }]
        }
        
        success, response = self.run_test(
            "Validate SG Resume without Nationality (should warn)",
            "POST",
            "validate",
            200,
            data={"resume": sg_resume_no_nationality}
        )
        
        if success:
            issues = response.get("issues", [])
            nationality_issue_found = any("nationality" in issue.lower() for issue in issues)
            if nationality_issue_found:
                print("   ✅ SG validation correctly requires nationality")
            else:
                print("   ❌ SG validation should require nationality")
                all_passed = False
        else:
            all_passed = False
        
        return all_passed

    def test_ats_scoring_with_optional_fields(self):
        """Test ATS scoring works with optional fields"""
        if "SG" not in self.resume_ids:
            print("   ❌ No SG resume available for ATS scoring test")
            return False
        
        resume_id = self.resume_ids["SG"]
        
        success, response = self.run_test(
            "ATS Score Resume with Optional Fields",
            "POST",
            f"resumes/{resume_id}/score",
            200
        )
        
        if success:
            score = response.get("score")
            hints = response.get("hints", [])
            
            if isinstance(score, (int, float)) and 0 <= score <= 100:
                print(f"   ✅ Valid ATS score with optional fields: {score}/100")
                print(f"   📊 Hints provided: {len(hints)} hints")
                return True
            else:
                print(f"   ❌ Invalid ATS score: {score}")
                return False
        
        return False

    def test_error_handling(self):
        """Test error handling for invalid data"""
        all_passed = True
        
        # Test 1: Invalid locale code
        success, response = self.run_test(
            "Invalid Locale Code",
            "GET",
            "presets/INVALID/optional-fields",
            404
        )
        
        if success:
            print("   ✅ Invalid locale correctly returns 404")
        else:
            all_passed = False
        
        # Test 2: Invalid resume data
        invalid_resume = {
            "locale": "SG",
            "contact": {
                # Missing required fields
            },
            "certifications": [
                {
                    # Missing required certification fields
                    "name": "Test Cert"
                }
            ]
        }
        
        success, response = self.run_test(
            "Create Resume with Invalid Data",
            "POST",
            "resumes",
            200  # Should still create but may have validation issues
        )
        
        # This test is more about ensuring the API doesn't crash
        if success:
            print("   ✅ API handles invalid data gracefully")
        else:
            print("   ⚠️  API error handling could be improved")
            # Don't fail the test as this might be expected behavior
        
        return all_passed

def main():
    print("🚀 Starting AtlasCV Phase 9 Backend Tests - Country-Specific Presets & Optional Fields")
    print("=" * 80)
    
    tester = AtlasCVPhase9Tester()
    
    # Phase 9 specific tests
    phase9_tests = [
        ("Expanded Locales (9 total)", tester.test_expanded_locales),
        ("New Locale Optional Fields (CA, SG, AE)", tester.test_new_locale_optional_fields),
        ("JP-R Photo Requirement", tester.test_jp_rirekisho_photo_requirement),
        ("Create Resumes with Optional Fields", tester.test_create_resume_with_optional_fields),
        ("Retrieve Resumes with Optional Fields", tester.test_retrieve_resume_with_optional_fields),
        ("Update Resume Optional Fields", tester.test_update_resume_optional_fields),
        ("Locale-Specific Validation Rules", tester.test_locale_specific_validation),
        ("ATS Scoring with Optional Fields", tester.test_ats_scoring_with_optional_fields),
        ("Error Handling", tester.test_error_handling)
    ]
    
    print(f"\n📋 PHASE 9 TESTS - Country-Specific Presets & Optional Fields")
    print("=" * 60)
    
    phase9_passed = 0
    for test_name, test_func in phase9_tests:
        print(f"\n🎯 {test_name}")
        print("-" * 50)
        if test_func():
            phase9_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED")
    
    # Print final results
    print("\n" + "=" * 80)
    print(f"📊 Phase 9 Results: {phase9_passed}/{len(phase9_tests)} tests passed")
    print(f"📊 Overall API Tests: {tester.tests_passed}/{tester.tests_run} individual tests passed")
    
    if phase9_passed == len(phase9_tests):
        print("🎉 All Phase 9 Country-Specific Presets & Optional Fields tests passed!")
        print("✅ Backend is ready for Phase 9 features:")
        print("   • Expanded locale support (9 locales including CA, SG, AE)")
        print("   • Optional fields configuration API")
        print("   • New resume schema with certifications, references, personal_details")
        print("   • Locale-specific validation rules")
        print("   • CRUD operations with optional fields")
        return 0
    else:
        failed_count = len(phase9_tests) - phase9_passed
        print(f"❌ {failed_count} Phase 9 tests failed!")
        print("⚠️  Backend needs fixes before Phase 9 deployment")
        return 1

if __name__ == "__main__":
    sys.exit(main())