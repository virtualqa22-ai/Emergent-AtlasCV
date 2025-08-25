import requests
import sys
import json
from datetime import datetime, timezone, timedelta
import uuid
import time

class AuthFlowTester:
    def __init__(self, base_url="https://inactive-cleanup.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        
        # Test user data
        self.test_user_email = f"auth-flow-{uuid.uuid4().hex[:8]}@atlascv.com"
        self.test_user_password = "authflow123"
        self.test_user_name = "Auth Flow Tester"
        self.auth_token = None
        self.user_id = None
        
        # Admin user data
        self.admin_email = f"admin-{uuid.uuid4().hex[:8]}@atlascv.com"
        self.admin_password = "admin123"
        self.admin_name = "Admin User"
        self.admin_token = None
        
        # Test resume IDs
        self.anonymous_resume_id = None
        self.authenticated_resume_id = None

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

    def test_anonymous_resume_creation(self):
        """Test 1: Anonymous resume creation (without auth headers) - verify it still works"""
        print("\n🔍 Testing Anonymous Resume Creation...")
        
        anonymous_resume = {
            "locale": "US",
            "contact": {
                "full_name": "Anonymous User",
                "email": f"anonymous-{uuid.uuid4().hex[:8]}@example.com",
                "phone": "+1-555-123-4567",
                "city": "New York",
                "state": "NY",
                "country": "USA"
            },
            "summary": "Anonymous user testing resume creation without authentication",
            "skills": ["JavaScript", "React", "Node.js", "Testing"],
            "experience": [{
                "id": str(uuid.uuid4()),
                "company": "Anonymous Corp",
                "title": "Software Developer",
                "city": "New York",
                "start_date": "2023-01",
                "end_date": "Present",
                "bullets": [
                    "Developed anonymous resume features",
                    "Tested backward compatibility"
                ]
            }]
        }
        
        # Create resume WITHOUT auth headers
        success, response = self.run_test(
            "Anonymous Resume Creation",
            "POST",
            "resumes",
            200,
            data=anonymous_resume
        )
        
        if not success:
            return False
        
        # Verify response structure
        if "id" not in response:
            print("   ❌ No resume ID returned")
            return False
        
        self.anonymous_resume_id = response["id"]
        
        # Verify user_id and user_email are None for anonymous resume
        if response.get("user_id") is not None:
            print(f"   ❌ Anonymous resume has user_id: {response.get('user_id')}")
            return False
        
        if response.get("user_email") is not None:
            print(f"   ❌ Anonymous resume has user_email: {response.get('user_email')}")
            return False
        
        print(f"   ✅ Anonymous resume created successfully with ID: {self.anonymous_resume_id}")
        print("   ✅ Resume correctly has no user association (user_id=None, user_email=None)")
        return True

    def test_user_signup_and_activity_tracking(self):
        """Test 2: User signup and verify initial activity tracking fields"""
        print("\n🔍 Testing User Signup and Activity Tracking...")
        
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
        
        if not success:
            return False
        
        # Store auth token and user info
        self.auth_token = response.get("access_token")
        user = response.get("user", {})
        self.user_id = user.get("id")
        
        # Verify user has activity tracking fields
        if "last_login_at" not in user:
            print("   ❌ User missing last_login_at field")
            return False
        
        if "last_activity_at" not in user:
            print("   ❌ User missing last_activity_at field")
            return False
        
        print(f"   ✅ User created with activity tracking fields")
        print(f"   ✅ User ID: {self.user_id}")
        return True

    def test_signin_activity_tracking(self):
        """Test 3: User signin and verify last_login_at and last_activity_at are updated"""
        print("\n🔍 Testing Signin Activity Tracking...")
        
        # Wait a moment to ensure timestamp difference
        time.sleep(1)
        
        signin_data = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        
        success, response = self.run_test(
            "User Signin with Activity Tracking",
            "POST",
            "auth/signin",
            200,
            data=signin_data
        )
        
        if not success:
            return False
        
        user = response.get("user", {})
        last_login_at = user.get("last_login_at")
        last_activity_at = user.get("last_activity_at")
        
        if not last_login_at:
            print("   ❌ last_login_at not set after signin")
            return False
        
        if not last_activity_at:
            print("   ❌ last_activity_at not set after signin")
            return False
        
        # Verify timestamps are recent (within last 10 seconds)
        try:
            login_time = datetime.fromisoformat(last_login_at.replace('Z', '+00:00'))
            activity_time = datetime.fromisoformat(last_activity_at.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            
            if (now - login_time).total_seconds() > 10:
                print(f"   ❌ last_login_at timestamp too old: {last_login_at}")
                return False
            
            if (now - activity_time).total_seconds() > 10:
                print(f"   ❌ last_activity_at timestamp too old: {last_activity_at}")
                return False
        except Exception as e:
            print(f"   ❌ Error parsing timestamps: {e}")
            return False
        
        # Update auth token
        self.auth_token = response.get("access_token")
        
        print(f"   ✅ last_login_at updated: {last_login_at}")
        print(f"   ✅ last_activity_at updated: {last_activity_at}")
        return True

    def test_authenticated_resume_creation(self):
        """Test 4: Authenticated resume creation - verify user association works"""
        print("\n🔍 Testing Authenticated Resume Creation...")
        
        if not self.auth_token:
            print("   ❌ No auth token available")
            return False
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.auth_token}'
        }
        
        authenticated_resume = {
            "locale": "US",
            "contact": {
                "full_name": self.test_user_name,
                "email": self.test_user_email,
                "phone": "+1-555-987-6543",
                "city": "San Francisco",
                "state": "CA",
                "country": "USA"
            },
            "summary": "Authenticated user testing resume creation with user association",
            "skills": ["Python", "FastAPI", "Authentication", "JWT"],
            "experience": [{
                "id": str(uuid.uuid4()),
                "company": "Auth Corp",
                "title": "Backend Developer",
                "city": "San Francisco",
                "start_date": "2023-06",
                "end_date": "Present",
                "bullets": [
                    "Implemented JWT authentication system",
                    "Added user activity tracking",
                    "Developed anonymous resume support"
                ]
            }]
        }
        
        success, response = self.run_test(
            "Authenticated Resume Creation",
            "POST",
            "resumes",
            200,
            data=authenticated_resume,
            headers=headers
        )
        
        if not success:
            return False
        
        # Verify response structure
        if "id" not in response:
            print("   ❌ No resume ID returned")
            return False
        
        self.authenticated_resume_id = response["id"]
        
        # Verify user association - these should be set for authenticated users
        user_id = response.get("user_id")
        user_email = response.get("user_email")
        
        if user_id != self.user_id:
            print(f"   ❌ Resume user_id mismatch: expected {self.user_id}, got {user_id}")
            return False
        
        if user_email != self.test_user_email:
            print(f"   ❌ Resume user_email mismatch: expected {self.test_user_email}, got {user_email}")
            return False
        
        print(f"   ✅ Authenticated resume created with ID: {self.authenticated_resume_id}")
        print(f"   ✅ Resume correctly associated with user_id: {user_id}")
        print(f"   ✅ Resume correctly associated with user_email: {user_email}")
        return True

    def test_activity_tracking_on_api_calls(self):
        """Test 5: Verify last_activity_at is updated on authenticated API calls"""
        print("\n🔍 Testing Activity Tracking on API Calls...")
        
        if not self.auth_token:
            print("   ❌ No auth token available")
            return False
        
        # Wait a moment to ensure timestamp difference
        time.sleep(1)
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.auth_token}'
        }
        
        # Make an authenticated API call (get current user)
        success, response = self.run_test(
            "Get Current User (Activity Tracking)",
            "GET",
            "auth/me",
            200,
            headers=headers
        )
        
        if not success:
            return False
        
        last_activity_at = response.get("last_activity_at")
        
        if not last_activity_at:
            print("   ❌ last_activity_at not updated after API call")
            return False
        
        # Verify timestamp is very recent (within last 5 seconds)
        try:
            activity_time = datetime.fromisoformat(last_activity_at.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            
            if (now - activity_time).total_seconds() > 5:
                print(f"   ❌ last_activity_at not recently updated: {last_activity_at}")
                return False
        except Exception as e:
            print(f"   ❌ Error parsing activity timestamp: {e}")
            return False
        
        print(f"   ✅ last_activity_at updated on API call: {last_activity_at}")
        return True

    def test_list_user_resumes(self):
        """Test 6: List user resumes - should only show authenticated user's resumes"""
        print("\n🔍 Testing List User Resumes...")
        
        if not self.auth_token:
            print("   ❌ No auth token available")
            return False
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.auth_token}'
        }
        
        success, response = self.run_test(
            "List User Resumes",
            "GET",
            "resumes",
            200,
            headers=headers
        )
        
        if not success:
            return False
        
        # Verify response is a list
        if not isinstance(response, list):
            print(f"   ❌ Expected list response, got {type(response)}")
            return False
        
        # Should have at least one resume (the authenticated one we created)
        if len(response) == 0:
            print("   ❌ No resumes returned for authenticated user")
            return False
        
        # Verify the authenticated resume is in the list
        authenticated_resume_found = False
        anonymous_resume_found = False
        
        for resume in response:
            if resume.get("id") == self.authenticated_resume_id:
                authenticated_resume_found = True
            if resume.get("id") == self.anonymous_resume_id:
                anonymous_resume_found = True
        
        if not authenticated_resume_found:
            print("   ❌ Authenticated resume not found in user's resume list")
            return False
        
        # Anonymous resume should NOT be in authenticated user's list
        if anonymous_resume_found:
            print("   ❌ Anonymous resume incorrectly appears in authenticated user's list")
            return False
        
        print(f"   ✅ Found {len(response)} resume(s) for authenticated user")
        print("   ✅ Authenticated resume found in list")
        print("   ✅ Anonymous resume correctly excluded from list")
        return True

    def test_create_admin_user(self):
        """Test 7: Create admin user for cleanup testing"""
        print("\n🔍 Creating Admin User for Cleanup Testing...")
        
        admin_signup_data = {
            "email": self.admin_email,
            "password": self.admin_password,
            "full_name": self.admin_name
        }
        
        success, response = self.run_test(
            "Admin User Signup",
            "POST",
            "auth/signup",
            200,
            data=admin_signup_data
        )
        
        if not success:
            return False
        
        self.admin_token = response.get("access_token")
        admin_user = response.get("user", {})
        admin_user_id = admin_user.get("id")
        
        # Manually set admin role (in real scenario, this would be done by another admin)
        # For testing purposes, we'll assume the user is created as admin
        # Note: The backend code checks for role == "admin", but signup creates role == "user"
        # This test will verify the endpoint requires admin role
        
        print(f"   ✅ Admin user created with ID: {admin_user_id}")
        print("   ⚠️  Note: User created with 'user' role, cleanup test will verify admin requirement")
        return True

    def test_admin_cleanup_endpoint_access_control(self):
        """Test 8: Admin cleanup endpoint access control - should require admin role"""
        print("\n🔍 Testing Admin Cleanup Endpoint Access Control...")
        
        if not self.auth_token:
            print("   ❌ No regular user auth token available")
            return False
        
        # Test with regular user token (should fail)
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.auth_token}'
        }
        
        success, response = self.run_test(
            "Cleanup with Regular User (Should Fail)",
            "POST",
            "admin/cleanup-inactive-users",
            403,  # Should return 403 Forbidden
            headers=headers
        )
        
        if success:
            print("   ✅ Regular user correctly denied access to admin endpoint")
            return True
        else:
            print("   ❌ Regular user was not properly denied access")
            return False

    def test_backward_compatibility(self):
        """Test 9: Verify backward compatibility - existing functionality still works"""
        print("\n🔍 Testing Backward Compatibility...")
        
        # Test that anonymous resume can still be retrieved
        if not self.anonymous_resume_id:
            print("   ❌ No anonymous resume ID available")
            return False
        
        success, response = self.run_test(
            "Get Anonymous Resume",
            "GET",
            f"resumes/{self.anonymous_resume_id}",
            200
        )
        
        if not success:
            return False
        
        # Verify resume data is correct
        if response.get("id") != self.anonymous_resume_id:
            print("   ❌ Resume ID mismatch")
            return False
        
        # Verify user fields are still None for anonymous resume
        if response.get("user_id") is not None:
            print("   ❌ Anonymous resume has user_id after retrieval")
            return False
        
        if response.get("user_email") is not None:
            print("   ❌ Anonymous resume has user_email after retrieval")
            return False
        
        # Test that anonymous resume can be updated
        update_data = {
            "summary": "Updated anonymous resume summary for backward compatibility test"
        }
        
        success, update_response = self.run_test(
            "Update Anonymous Resume",
            "PUT",
            f"resumes/{self.anonymous_resume_id}",
            200,
            data=update_data
        )
        
        if not success:
            return False
        
        # Verify update worked
        if update_response.get("summary") != update_data["summary"]:
            print("   ❌ Anonymous resume update failed")
            return False
        
        # Test that anonymous resume can be scored
        success, score_response = self.run_test(
            "Score Anonymous Resume",
            "POST",
            f"resumes/{self.anonymous_resume_id}/score",
            200
        )
        
        if not success:
            return False
        
        # Verify score structure
        if "score" not in score_response or "hints" not in score_response:
            print("   ❌ Score response structure invalid")
            return False
        
        print("   ✅ Anonymous resume retrieval works")
        print("   ✅ Anonymous resume update works")
        print("   ✅ Anonymous resume scoring works")
        print("   ✅ Backward compatibility maintained")
        return True

    def test_new_user_model_fields_compatibility(self):
        """Test 10: Verify new user model fields don't break existing functionality"""
        print("\n🔍 Testing New User Model Fields Compatibility...")
        
        if not self.auth_token:
            print("   ❌ No auth token available")
            return False
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.auth_token}'
        }
        
        # Test that user info retrieval works with new fields
        success, response = self.run_test(
            "Get User Info with New Fields",
            "GET",
            "auth/me",
            200,
            headers=headers
        )
        
        if not success:
            return False
        
        # Verify all expected fields are present
        required_fields = ["id", "email", "full_name", "created_at", "updated_at", 
                          "last_login_at", "last_activity_at", "is_active", "role"]
        
        missing_fields = []
        for field in required_fields:
            if field not in response:
                missing_fields.append(field)
        
        if missing_fields:
            print(f"   ❌ Missing user fields: {missing_fields}")
            return False
        
        # Verify field types and values
        if not isinstance(response.get("is_active"), bool):
            print("   ❌ is_active field is not boolean")
            return False
        
        if response.get("role") not in ["user", "admin"]:
            print(f"   ❌ Invalid role value: {response.get('role')}")
            return False
        
        # Test token refresh still works
        success, refresh_response = self.run_test(
            "Token Refresh with New Fields",
            "POST",
            "auth/refresh",
            200,
            headers=headers
        )
        
        if not success:
            return False
        
        # Verify refresh response structure
        if "access_token" not in refresh_response or "user" not in refresh_response:
            print("   ❌ Token refresh response structure invalid")
            return False
        
        print("   ✅ All user model fields present and valid")
        print("   ✅ Token refresh works with new user model")
        print("   ✅ New user model fields don't break existing functionality")
        return True

def main():
    print("🚀 Starting AtlasCV Auth Flow Testing")
    print("Testing modified authentication flow backend changes")
    print("=" * 70)
    
    tester = AuthFlowTester()
    
    # Define test sequence
    auth_flow_tests = [
        ("Anonymous Resume Creation", tester.test_anonymous_resume_creation),
        ("User Signup & Activity Tracking", tester.test_user_signup_and_activity_tracking),
        ("Signin Activity Tracking", tester.test_signin_activity_tracking),
        ("Authenticated Resume Creation", tester.test_authenticated_resume_creation),
        ("Activity Tracking on API Calls", tester.test_activity_tracking_on_api_calls),
        ("List User Resumes", tester.test_list_user_resumes),
        ("Create Admin User", tester.test_create_admin_user),
        ("Admin Cleanup Access Control", tester.test_admin_cleanup_endpoint_access_control),
        ("Backward Compatibility", tester.test_backward_compatibility),
        ("New User Model Fields", tester.test_new_user_model_fields_compatibility)
    ]
    
    print(f"\n🔍 Running {len(auth_flow_tests)} Auth Flow Tests...")
    print("=" * 50)
    
    passed_tests = 0
    failed_tests = []
    
    for test_name, test_func in auth_flow_tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        if test_func():
            passed_tests += 1
            print(f"✅ {test_name} - PASSED")
        else:
            failed_tests.append(test_name)
            print(f"❌ {test_name} - FAILED")
    
    # Print final results
    print("\n" + "=" * 70)
    print("🎯 AUTH FLOW TEST RESULTS")
    print("=" * 70)
    print(f"📊 Total Tests: {len(auth_flow_tests)}")
    print(f"✅ Passed: {passed_tests}")
    print(f"❌ Failed: {len(failed_tests)}")
    print(f"📈 Success Rate: {(passed_tests/len(auth_flow_tests)*100):.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed Tests:")
        for test in failed_tests:
            print(f"   - {test}")
    
    print(f"\n📊 Overall Backend Tests: {tester.tests_passed}/{tester.tests_run} passed")
    
    if passed_tests == len(auth_flow_tests):
        print("\n🎉 All Auth Flow Tests Passed!")
        print("✅ Anonymous resume creation works")
        print("✅ Authenticated resume creation with user association works")
        print("✅ User activity tracking (last_login_at, last_activity_at) works")
        print("✅ Admin cleanup endpoint access control works")
        print("✅ Backward compatibility maintained")
        print("✅ New user model fields don't break existing functionality")
        return 0
    else:
        print(f"\n⚠️  {len(failed_tests)} Auth Flow Tests Failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())