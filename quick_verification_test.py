#!/usr/bin/env python3
"""
Quick Backend Verification Test for AtlasCV
Focus: Verify core endpoints after frontend logo/image updates
"""

import requests
import sys
import json
import uuid
from datetime import datetime

class QuickVerificationTester:
    def __init__(self, base_url="https://server-diagnostics.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_email = f"quick-test-{uuid.uuid4().hex[:8]}@atlascv.com"
        self.test_user_password = "quicktest123"
        self.test_user_name = "Quick Test User"

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

    def test_api_health(self):
        """Test 1: Basic API health (GET /api/)"""
        print("\n" + "="*50)
        print("TEST 1: Basic API Health Check")
        print("="*50)
        
        success, response = self.run_test(
            "API Health Check",
            "GET",
            "",
            200
        )
        
        if success and response.get("message") == "AtlasCV backend up":
            print("   ✅ API is healthy and responding correctly")
            return True
        else:
            print("   ❌ API health check failed or incorrect response")
            return False

    def test_auth_signup(self):
        """Test 2: Auth endpoint (POST /api/auth/signup)"""
        print("\n" + "="*50)
        print("TEST 2: Authentication Signup Endpoint")
        print("="*50)
        
        signup_data = {
            "email": self.test_user_email,
            "password": self.test_user_password,
            "full_name": self.test_user_name
        }
        
        success, response = self.run_test(
            "User Signup",
            "POST",
            "auth/signup",
            200,
            data=signup_data
        )
        
        if success:
            # Verify response structure
            required_fields = ["access_token", "token_type", "user"]
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                print(f"   ❌ Missing required fields: {missing_fields}")
                return False
            
            if response.get("token_type") != "bearer":
                print(f"   ❌ Expected token_type 'bearer', got '{response.get('token_type')}'")
                return False
            
            user = response.get("user", {})
            if user.get("email") != self.test_user_email:
                print(f"   ❌ Email mismatch in response")
                return False
            
            print("   ✅ User signup successful with proper JWT token")
            print(f"   ✅ User ID: {user.get('id')}")
            print(f"   ✅ Token type: {response.get('token_type')}")
            return True
        else:
            print("   ❌ User signup failed")
            return False

    def test_resume_creation(self):
        """Test 3: Resume creation endpoint"""
        print("\n" + "="*50)
        print("TEST 3: Resume Creation Endpoint")
        print("="*50)
        
        test_resume = {
            "locale": "US",
            "contact": {
                "full_name": "Sarah Johnson",
                "email": f"sarah-{uuid.uuid4().hex[:8]}@atlascv.com",
                "phone": "+1-555-987-6543",
                "city": "Seattle",
                "state": "WA",
                "country": "USA",
                "linkedin": "https://linkedin.com/in/sarah-johnson",
                "website": "https://sarah-portfolio.dev"
            },
            "summary": "Experienced software engineer specializing in full-stack web development with React and Node.js",
            "skills": ["React", "Node.js", "TypeScript", "AWS", "Python", "PostgreSQL"],
            "experience": [{
                "id": str(uuid.uuid4()),
                "company": "TechCorp Solutions",
                "title": "Senior Software Engineer",
                "city": "Seattle",
                "start_date": "2022-03",
                "end_date": "Present",
                "bullets": [
                    "Led development of customer-facing web applications using React and Node.js",
                    "Improved application performance by 35% through code optimization",
                    "Mentored 3 junior developers and conducted code reviews"
                ]
            }],
            "education": [{
                "id": str(uuid.uuid4()),
                "institution": "University of Washington",
                "degree": "Bachelor of Science in Computer Science",
                "start_date": "2018-09",
                "end_date": "2022-06",
                "details": "Graduated Magna Cum Laude, GPA: 3.8/4.0"
            }],
            "projects": [{
                "id": str(uuid.uuid4()),
                "name": "E-commerce Platform",
                "description": "Full-stack e-commerce application with payment integration",
                "tech": ["React", "Node.js", "MongoDB", "Stripe API"],
                "link": "https://github.com/sarah/ecommerce-platform"
            }]
        }
        
        success, response = self.run_test(
            "Create Resume",
            "POST",
            "resumes",
            200,
            data=test_resume
        )
        
        if success:
            resume_id = response.get("id")
            if not resume_id:
                print("   ❌ No resume ID returned")
                return False
            
            # Verify key fields are preserved
            contact = response.get("contact", {})
            if contact.get("full_name") != "Sarah Johnson":
                print("   ❌ Contact name not preserved")
                return False
            
            if response.get("locale") != "US":
                print("   ❌ Locale not preserved")
                return False
            
            skills = response.get("skills", [])
            if len(skills) != 6:
                print(f"   ❌ Expected 6 skills, got {len(skills)}")
                return False
            
            experience = response.get("experience", [])
            if len(experience) != 1:
                print(f"   ❌ Expected 1 experience entry, got {len(experience)}")
                return False
            
            print("   ✅ Resume created successfully")
            print(f"   ✅ Resume ID: {resume_id}")
            print(f"   ✅ Contact preserved: {contact.get('full_name')}")
            print(f"   ✅ Skills count: {len(skills)}")
            print(f"   ✅ Experience entries: {len(experience)}")
            return True
        else:
            print("   ❌ Resume creation failed")
            return False

    def run_verification(self):
        """Run all verification tests"""
        print("🚀 AtlasCV Quick Backend Verification")
        print("📋 Focus: Core endpoints after frontend logo/image updates")
        print("🎯 Expected: All should work normally (frontend-only changes)")
        print("="*70)
        
        # Run the three core tests
        test_results = []
        
        # Test 1: API Health
        test_results.append(self.test_api_health())
        
        # Test 2: Auth Signup
        test_results.append(self.test_auth_signup())
        
        # Test 3: Resume Creation
        test_results.append(self.test_resume_creation())
        
        # Summary
        print("\n" + "="*70)
        print("📊 VERIFICATION RESULTS")
        print("="*70)
        
        passed_count = sum(test_results)
        total_count = len(test_results)
        
        test_names = [
            "1. API Health Check (GET /api/)",
            "2. Auth Signup (POST /api/auth/signup)",
            "3. Resume Creation (POST /api/resumes)"
        ]
        
        for i, (test_name, result) in enumerate(zip(test_names, test_results)):
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"   {test_name}: {status}")
        
        print(f"\n📈 Overall: {passed_count}/{total_count} tests passed")
        
        if passed_count == total_count:
            print("🎉 SUCCESS: All core endpoints working normally!")
            print("✅ Backend unaffected by frontend logo/image changes")
            return True
        else:
            print("⚠️  WARNING: Some core endpoints have issues")
            print("❌ Backend may have been affected or has existing issues")
            return False

def main():
    tester = QuickVerificationTester()
    success = tester.run_verification()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())