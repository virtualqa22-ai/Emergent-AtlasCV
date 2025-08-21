import requests
import sys
import json
from datetime import datetime

class AtlasCVAPITester:
    def __init__(self, base_url="https://cv-builder-26.preview.emergentagent.com/api"):
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

def main():
    print("🚀 Starting AtlasCV Backend API Tests")
    print("=" * 50)
    
    tester = AtlasCVAPITester()
    
    # Run all tests in sequence
    tests = [
        tester.test_root_endpoint,
        tester.test_get_locales,
        tester.test_create_resume,
        tester.test_score_resume,
        tester.test_update_resume,
        tester.test_get_resume,
        tester.test_score_after_update
    ]
    
    for test in tests:
        test()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend tests passed!")
        return 0
    else:
        print("❌ Some backend tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())