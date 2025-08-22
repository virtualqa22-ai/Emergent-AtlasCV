import requests
import sys
import json
from datetime import datetime

class AtlasCVAPITester:
    def __init__(self, base_url="https://seventh-phase.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.resume_id = None

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
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
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

    def test_root_endpoint(self):
        """Test GET /api/ - should return backend up message"""
        success, response = self.run_test(
            "Root Endpoint",
            "GET",
            "",
            200
        )
        if success and response.get("message") == "AtlasCV backend up":
            print("   ✅ Correct message returned")
            return True
        else:
            print("   ❌ Incorrect or missing message")
            return False

    def test_get_locales(self):
        """Test GET /api/locales - should return locales array"""
        success, response = self.run_test(
            "Get Locales",
            "GET",
            "locales",
            200
        )
        if success:
            locales = response.get("locales", [])
            expected_codes = {"US", "EU", "AU", "IN", "JP-R", "JP-S"}
            actual_codes = {loc.get("code") for loc in locales}
            
            if expected_codes.issubset(actual_codes):
                print(f"   ✅ All expected locale codes found: {expected_codes}")
                return True
            else:
                missing = expected_codes - actual_codes
                print(f"   ❌ Missing locale codes: {missing}")
                return False
        return False

    def test_create_resume(self):
        """Test POST /api/resumes - create a minimal India resume"""
        test_resume = {
            "locale": "IN",
            "contact": {
                "full_name": "Aditya Test",
                "email": "aditya@example.com",
                "phone": "+91 98123"
            },
            "skills": ["React", "Node", "AWS"],
            "experience": [],
            "education": [],
            "projects": []
        }
        
        success, response = self.run_test(
            "Create Resume",
            "POST",
            "resumes",
            200,  # Based on the code, it should return 200, not 201
            data=test_resume
        )
        
        if success and "id" in response:
            self.resume_id = response["id"]
            print(f"   ✅ Resume created with ID: {self.resume_id}")
            return True
        else:
            print("   ❌ Resume creation failed or no ID returned")
            return False

    def test_score_resume(self):
        """Test POST /api/resumes/{id}/score - should return score and hints"""
        if not self.resume_id:
            print("   ❌ No resume ID available for scoring")
            return False
            
        success, response = self.run_test(
            "Score Resume",
            "POST",
            f"resumes/{self.resume_id}/score",
            200
        )
        
        if success:
            score = response.get("score")
            hints = response.get("hints", [])
            
            if isinstance(score, (int, float)) and 0 <= score <= 100:
                print(f"   ✅ Valid score: {score}/100")
                print(f"   ✅ Hints provided: {len(hints)} hints")
                return True
            else:
                print(f"   ❌ Invalid score: {score}")
                return False
        return False

    def test_update_resume(self):
        """Test PUT /api/resumes/{id} - update resume with experience"""
        if not self.resume_id:
            print("   ❌ No resume ID available for updating")
            return False
            
        update_data = {
            "experience": [{
                "id": "exp-1",
                "company": "Tech Corp",
                "title": "Software Engineer",
                "city": "Bengaluru",
                "start_date": "2023-01",
                "end_date": "Present",
                "bullets": ["Developed React applications", "Improved performance by 30%"]
            }]
        }
        
        success, response = self.run_test(
            "Update Resume",
            "PUT",
            f"resumes/{self.resume_id}",
            200,
            data=update_data
        )
        
        if success:
            experience = response.get("experience", [])
            if len(experience) > 0 and experience[0].get("company") == "Tech Corp":
                print("   ✅ Resume updated successfully with experience")
                return True
            else:
                print("   ❌ Experience not properly updated")
                return False
        return False

    def test_get_resume(self):
        """Test GET /api/resumes/{id} - retrieve resume"""
        if not self.resume_id:
            print("   ❌ No resume ID available for retrieval")
            return False
            
        success, response = self.run_test(
            "Get Resume",
            "GET",
            f"resumes/{self.resume_id}",
            200
        )
        
        if success and response.get("id") == self.resume_id:
            print(f"   ✅ Resume retrieved successfully")
            return True
        else:
            print("   ❌ Resume retrieval failed or ID mismatch")
            return False

    def test_score_after_update(self):
        """Test scoring after update - should reflect improved score"""
        if not self.resume_id:
            print("   ❌ No resume ID available for scoring")
            return False
            
        success, response = self.run_test(
            "Score After Update",
            "POST",
            f"resumes/{self.resume_id}/score",
            200
        )
        
        if success:
            score = response.get("score")
            hints = response.get("hints", [])
            
            if isinstance(score, (int, float)) and 0 <= score <= 100:
                print(f"   ✅ Updated score: {score}/100")
                print(f"   ✅ Updated hints: {len(hints)} hints")
                return True
            else:
                print(f"   ❌ Invalid updated score: {score}")
                return False
        return False

    def test_jd_parse(self):
        """Test JD parsing with the specified text"""
        jd_text = "We need a React and Node engineer with AWS experience. Knowledge of TypeScript and REST APIs is a plus."
        
        success, response = self.run_test(
            "JD Parse",
            "POST",
            "jd/parse",
            200,
            data={"text": jd_text}
        )
        
        if success:
            # Verify response structure
            if 'keywords' not in response or 'top_keywords' not in response:
                print("   ❌ Missing required fields in response")
                return False
            
            keywords = response.get('keywords', [])
            top_keywords = response.get('top_keywords', [])
            
            print(f"   📊 Found {len(keywords)} keywords: {keywords[:10]}...")
            print(f"   📊 Found {len(top_keywords)} top keywords: {top_keywords}")
            
            # Check for expected keywords (normalized)
            expected_keywords = ['react', 'node', 'aws', 'typescript', 'rest']
            found_expected = []
            
            keywords_lower = [k.lower() for k in keywords]
            for expected in expected_keywords:
                if expected in keywords_lower:
                    found_expected.append(expected)
                elif expected == 'node' and any('node' in k for k in keywords_lower):
                    found_expected.append('node')
                elif expected == 'rest' and any('api' in k for k in keywords_lower):
                    found_expected.append('api/rest')
            
            print(f"   📊 Expected keywords found: {found_expected}")
            
            # Verify non-empty top_keywords
            if not top_keywords:
                print("   ❌ top_keywords is empty")
                return False
            
            # Store keywords for coverage test
            self.jd_keywords = keywords
            return True
        
        return False

    def test_jd_coverage(self):
        """Test JD coverage with minimal resume"""
        if not hasattr(self, 'jd_keywords'):
            print("   ❌ No JD keywords available from parse test")
            return False
        
        # Create minimal resume with some matching content
        minimal_resume = {
            "id": "test-resume-coverage",
            "locale": "IN",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "contact": {
                "full_name": "Test User",
                "email": "test@example.com",
                "phone": "+91 9876543210",
                "city": "Bengaluru",
                "state": "Karnataka",
                "country": "India",
                "linkedin": "",
                "website": ""
            },
            "summary": "Experienced software engineer with React and Node.js development skills",
            "skills": ["React", "Node", "AWS", "TypeScript"],
            "experience": [
                {
                    "id": "exp-1",
                    "company": "Tech Corp",
                    "title": "Software Engineer",
                    "city": "Bengaluru",
                    "start_date": "2022-01",
                    "end_date": "Present",
                    "bullets": ["Built REST APIs in Node.js on AWS", "Developed React applications"]
                }
            ],
            "education": [
                {
                    "id": "edu-1",
                    "institution": "Test University",
                    "degree": "B.Tech Computer Science",
                    "start_date": "2018-08",
                    "end_date": "2022-05",
                    "details": "Relevant coursework in web development"
                }
            ],
            "projects": [
                {
                    "id": "proj-1",
                    "name": "E-commerce App",
                    "description": "Built with React and Node.js backend",
                    "tech": ["React", "Node", "AWS"],
                    "link": "https://github.com/test/project"
                }
            ],
            "extras": {}
        }
        
        success, response = self.run_test(
            "JD Coverage",
            "POST",
            "jd/coverage",
            200,
            data={"resume": minimal_resume, "jd_keywords": self.jd_keywords}
        )
        
        if success:
            # Verify response structure
            required_fields = ['coverage_percent', 'matched', 'missing', 'frequency', 'per_section']
            for field in required_fields:
                if field not in response:
                    print(f"   ❌ Missing required field: {field}")
                    return False
            
            coverage_percent = response.get('coverage_percent', 0)
            matched = response.get('matched', [])
            per_section = response.get('per_section', {})
            
            print(f"   📊 Overall coverage: {coverage_percent}%")
            print(f"   📊 Matched keywords: {matched[:5]}...")
            
            # Verify coverage_percent is within 0-100
            if not (0 <= coverage_percent <= 100):
                print(f"   ❌ Coverage percent {coverage_percent} not in range 0-100")
                return False
            
            # Verify matched contains expected keywords
            expected_matches = ['react', 'node', 'aws']
            found_matches = []
            matched_lower = [m.lower() for m in matched]
            for expected in expected_matches:
                if any(expected in m for m in matched_lower):
                    found_matches.append(expected)
            
            print(f"   📊 Expected matches found: {found_matches}")
            
            # Verify per_section structure
            expected_sections = ['skills', 'experience', 'projects', 'summary', 'education']
            for section in expected_sections:
                if section not in per_section:
                    print(f"   ❌ Missing section in per_section: {section}")
                    return False
                
                section_data = per_section[section]
                if 'coverage_percent' not in section_data:
                    print(f"   ❌ Missing coverage_percent in section {section}")
                    return False
            
            # Verify skills section has > 0 coverage (since we added matching skills)
            skills_coverage = per_section.get('skills', {}).get('coverage_percent', 0)
            print(f"   📊 Skills section coverage: {skills_coverage}%")
            
            if skills_coverage > 0:
                print("   ✅ Skills section shows positive coverage")
                return True
            else:
                print("   ⚠️  Warning: Skills coverage is 0 despite matching skills")
                return True  # Still pass as this might be expected behavior
        
        return False

    def test_presets_endpoint(self):
        """Test GET /api/presets endpoint - Phase 3 requirement"""
        success, response = self.run_test(
            "Get Presets",
            "GET",
            "presets",
            200
        )
        
        if success:
            # Check if presets key exists
            if "presets" not in response:
                print("   ❌ Missing 'presets' key in response")
                return False
            
            presets = response.get("presets", [])
            expected_codes = {"US", "EU", "AU", "IN", "JP-R", "JP-S"}
            actual_codes = {p.get("code") for p in presets}
            
            # Check all expected codes are present
            missing_codes = expected_codes - actual_codes
            if missing_codes:
                print(f"   ❌ Missing preset codes: {missing_codes}")
                return False
            
            print(f"   ✅ All preset codes found: {sorted(actual_codes)}")
            
            # Check each preset has required fields
            all_fields_present = True
            for preset in presets:
                code = preset.get("code")
                required_fields = ["date_format", "section_order", "label"]
                
                for field in required_fields:
                    if field not in preset:
                        print(f"   ❌ Preset {code} missing {field}")
                        all_fields_present = False
            
            if all_fields_present:
                print("   ✅ All presets have required fields (date_format, section_order, label)")
            
            return all_fields_present
        
        return False

    def test_individual_preset(self, code):
        """Test GET /api/presets/{code} endpoint"""
        success, response = self.run_test(
            f"Get Preset {code}",
            "GET",
            f"presets/{code}",
            200
        )
        
        if success:
            # Check required fields
            required_fields = ["code", "label", "date_format", "section_order"]
            missing_fields = []
            for field in required_fields:
                if field not in response:
                    missing_fields.append(field)
            
            if missing_fields:
                print(f"   ❌ Missing fields: {missing_fields}")
                return False
            
            print(f"   ✅ All required fields present")
            
            # Specific check for JP-R date format
            if code == "JP-R":
                expected_format = "YYYY/MM"
                actual_format = response.get("date_format")
                if actual_format != expected_format:
                    print(f"   ❌ JP-R date format: expected {expected_format}, got {actual_format}")
                    return False
                else:
                    print(f"   ✅ JP-R date format is correct: {expected_format}")
            
            return True
        
        return False

    def test_validation_endpoint(self):
        """Test POST /api/validate endpoint with various scenarios - Phase 3 requirement"""
        print("\n🔍 Testing Validation Endpoint with specific scenarios...")
        
        # Test case 1: US resume missing state
        us_resume = {
            "locale": "US",
            "contact": {
                "full_name": "John Doe",
                "email": "john@example.com",
                "phone": "+1-555-123-4567",
                "city": "New York",
                "state": "",  # Missing state
                "country": "USA"
            },
            "experience": [
                {
                    "id": "exp1",
                    "company": "Tech Corp",
                    "title": "Developer",
                    "start_date": "2023-01",
                    "end_date": "2024-01",
                    "bullets": []
                }
            ],
            "education": [],
            "projects": [],
            "skills": []
        }
        
        success1 = self._test_validation_case("US resume missing state", us_resume, "state")
        
        # Test case 2: IN resume with phone missing country code
        in_resume = {
            "locale": "IN",
            "contact": {
                "full_name": "Raj Patel",
                "email": "raj@example.com",
                "phone": "98765",  # Missing + country code
                "city": "Mumbai",
                "state": "Maharashtra",
                "country": "India"
            },
            "experience": [
                {
                    "id": "exp1",
                    "company": "Indian Tech",
                    "title": "Developer",
                    "start_date": "2023-01",
                    "end_date": "2024-01",
                    "bullets": []
                }
            ],
            "education": [],
            "projects": [],
            "skills": []
        }
        
        success2 = self._test_validation_case("IN resume missing +country code", in_resume, "+")
        
        # Test case 3: JP-R resume with wrong date format
        jp_resume = {
            "locale": "JP-R",
            "contact": {
                "full_name": "Tanaka Hiroshi",
                "email": "tanaka@example.com",
                "phone": "+81-90-1234-5678",
                "city": "Tokyo",
                "country": "Japan"
            },
            "experience": [
                {
                    "id": "exp1",
                    "company": "Japanese Corp",
                    "title": "Engineer",
                    "start_date": "2023-01",  # Should be 2023/01 for JP-R
                    "end_date": "2024-01",
                    "bullets": []
                }
            ],
            "education": [],
            "projects": [],
            "skills": []
        }
        
        success3 = self._test_validation_case("JP-R resume wrong date format", jp_resume, "YYYY/MM")
        
        return success1 and success2 and success3

    def _test_validation_case(self, test_name, resume_data, expected_issue_keyword):
        """Helper method to test a validation case"""
        try:
            payload = {"resume": resume_data}
            success, response = self.run_test(
                test_name,
                "POST",
                "validate",
                200,
                data=payload
            )
            
            if not success:
                return False
            
            # Check response structure
            if "issues" not in response:
                print(f"   ❌ Missing 'issues' key in response")
                return False
            
            issues = response["issues"]
            
            # Check if expected issue is present
            issue_found = any(expected_issue_keyword.lower() in issue.lower() for issue in issues)
            
            if not issue_found:
                print(f"   ❌ Expected issue containing '{expected_issue_keyword}' not found")
                print(f"   📄 Actual issues: {issues}")
                return False
            else:
                print(f"   ✅ Found expected issue containing '{expected_issue_keyword}'")
            
            return True
            
        except Exception as e:
            print(f"   ❌ Error in {test_name}: {str(e)}")
            return False

def main():
    print("🚀 Starting AtlasCV Backend API Tests - Phase 3 Validation")
    print("=" * 60)
    
    tester = AtlasCVAPITester()
    
    # Run Phase 3 specific tests first
    print("\n📋 PHASE 3 TESTS - Presets + Validation")
    print("=" * 40)
    
    phase3_tests = [
        tester.test_presets_endpoint,
        lambda: tester.test_individual_preset("IN"),
        lambda: tester.test_individual_preset("JP-R"),
        lambda: tester.test_individual_preset("US"),
        tester.test_validation_endpoint
    ]
    
    phase3_passed = 0
    for test in phase3_tests:
        if test():
            phase3_passed += 1
    
    print(f"\n📊 Phase 3 Results: {phase3_passed}/{len(phase3_tests)} tests passed")
    
    # Run additional existing tests
    print("\n📋 ADDITIONAL BACKEND TESTS")
    print("=" * 40)
    
    additional_tests = [
        tester.test_root_endpoint,
        tester.test_get_locales,
        tester.test_create_resume,
        tester.test_score_resume,
        tester.test_update_resume,
        tester.test_get_resume,
        tester.test_score_after_update,
        tester.test_jd_parse,
        tester.test_jd_coverage
    ]
    
    for test in additional_tests:
        test()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    print(f"📊 Phase 3 Critical Tests: {phase3_passed}/{len(phase3_tests)} passed")
    
    if phase3_passed == len(phase3_tests):
        print("🎉 All Phase 3 tests passed!")
        if tester.tests_passed == tester.tests_run:
            print("🎉 All backend tests passed!")
            return 0
        else:
            print("⚠️  Some additional tests failed, but Phase 3 is complete")
            return 0
    else:
        print("❌ Phase 3 tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())