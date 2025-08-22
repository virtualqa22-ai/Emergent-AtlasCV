import requests
import json
import sys

class EdgeCaseAPITester:
    def __init__(self, base_url="https://review-portal-3.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

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

    def test_ai_empty_inputs(self):
        """Test AI endpoints with empty inputs"""
        print("\n🔍 Testing AI endpoints with empty inputs...")
        
        # Test empty bullets
        success1, _ = self.run_test(
            "AI Rewrite - Empty Bullets",
            "POST",
            "ai/rewrite-bullets",
            200,
            data={"bullets": [], "role_title": "Engineer", "tone": "impactful"}
        )
        
        # Test empty text for linting
        success2, _ = self.run_test(
            "AI Lint - Empty Text",
            "POST",
            "ai/lint",
            200,
            data={"text": "", "section": "summary"}
        )
        
        # Test empty keywords
        success3, _ = self.run_test(
            "AI Keywords - Empty List",
            "POST",
            "ai/suggest-keywords",
            200,
            data={"jd_keywords": [], "resume_text": "Some text"}
        )
        
        return success1 and success2 and success3

    def test_ai_long_inputs(self):
        """Test AI endpoints with very long inputs"""
        print("\n🔍 Testing AI endpoints with long inputs...")
        
        # Very long bullet points
        long_bullets = [
            "This is an extremely long bullet point that contains a lot of detailed information about various projects and achievements that were accomplished during my tenure at the company including but not limited to developing complex software applications, managing large teams of developers, implementing new technologies and frameworks, optimizing performance metrics, and delivering high-quality solutions to clients across multiple industries and domains while maintaining strict adherence to coding standards and best practices." * 3
        ]
        
        success1, _ = self.run_test(
            "AI Rewrite - Long Bullets",
            "POST",
            "ai/rewrite-bullets",
            200,
            data={"bullets": long_bullets, "role_title": "Senior Engineer", "tone": "impactful"}
        )
        
        # Very long text for linting
        long_text = "This is a very long summary text that contains multiple sentences and paragraphs describing various aspects of professional experience and skills. " * 20
        
        success2, _ = self.run_test(
            "AI Lint - Long Text",
            "POST",
            "ai/lint",
            200,
            data={"text": long_text, "section": "summary"}
        )
        
        # Many keywords
        many_keywords = [f"keyword{i}" for i in range(50)]
        
        success3, _ = self.run_test(
            "AI Keywords - Many Keywords",
            "POST",
            "ai/suggest-keywords",
            200,
            data={"jd_keywords": many_keywords, "resume_text": "Professional experience"}
        )
        
        return success1 and success2 and success3

    def test_ai_invalid_payloads(self):
        """Test AI endpoints with invalid JSON payloads"""
        print("\n🔍 Testing AI endpoints with invalid payloads...")
        
        # Missing required fields
        success1, _ = self.run_test(
            "AI Rewrite - Missing Bullets",
            "POST",
            "ai/rewrite-bullets",
            422,  # Expecting validation error
            data={"role_title": "Engineer", "tone": "impactful"}
        )
        
        # Invalid section type
        success2, _ = self.run_test(
            "AI Lint - Invalid Section",
            "POST",
            "ai/lint",
            422,  # Expecting validation error
            data={"text": "Some text", "section": "invalid_section"}
        )
        
        # Wrong data types
        success3, _ = self.run_test(
            "AI Keywords - Wrong Types",
            "POST",
            "ai/suggest-keywords",
            422,  # Expecting validation error
            data={"jd_keywords": "not_a_list", "resume_text": 123}
        )
        
        return success1 and success2 and success3

    def test_ai_special_characters(self):
        """Test AI endpoints with special characters and unicode"""
        print("\n🔍 Testing AI endpoints with special characters...")
        
        # Special characters in bullets
        special_bullets = [
            "Développé des applications avec React & Node.js (amélioration de 25%)",
            "Built APIs using C# & .NET framework → improved performance by 30%",
            "Managed team of 5+ developers 🚀 delivering high-quality solutions"
        ]
        
        success1, _ = self.run_test(
            "AI Rewrite - Special Characters",
            "POST",
            "ai/rewrite-bullets",
            200,
            data={"bullets": special_bullets, "role_title": "Développeur", "tone": "impactful"}
        )
        
        # Unicode text for linting
        unicode_text = "Experienced software engineer with expertise in développement d'applications web. Skilled in React, Node.js, and various frameworks. Passionate about creating innovative solutions that drive business growth and improve user experience. 日本語も話せます。"
        
        success2, _ = self.run_test(
            "AI Lint - Unicode Text",
            "POST",
            "ai/lint",
            200,
            data={"text": unicode_text, "section": "summary"}
        )
        
        # Keywords with special characters
        special_keywords = ["C#", ".NET", "React.js", "Node.js", "AWS/Azure", "CI/CD", "REST/GraphQL"]
        
        success3, _ = self.run_test(
            "AI Keywords - Special Characters",
            "POST",
            "ai/suggest-keywords",
            200,
            data={"jd_keywords": special_keywords, "resume_text": "Full-stack developer"}
        )
        
        return success1 and success2 and success3

    def test_jd_edge_cases(self):
        """Test JD parsing and coverage with edge cases"""
        print("\n🔍 Testing JD parsing edge cases...")
        
        # Empty JD text
        success1, _ = self.run_test(
            "JD Parse - Empty Text",
            "POST",
            "jd/parse",
            200,
            data={"text": ""}
        )
        
        # JD with only stopwords
        success2, _ = self.run_test(
            "JD Parse - Only Stopwords",
            "POST",
            "jd/parse",
            200,
            data={"text": "the and or for with of to in on by at from as is are be an"}
        )
        
        # Very long JD text
        long_jd = "We are looking for a senior software engineer with extensive experience in React, Node.js, Python, Java, C#, .NET, AWS, Azure, Docker, Kubernetes, MongoDB, PostgreSQL, Redis, Elasticsearch, GraphQL, REST APIs, microservices, CI/CD, Jenkins, Git, Agile, Scrum, machine learning, artificial intelligence, data science, big data, Hadoop, Spark, Kafka, RabbitMQ, and many other technologies. " * 10
        
        success3, _ = self.run_test(
            "JD Parse - Very Long Text",
            "POST",
            "jd/parse",
            200,
            data={"text": long_jd}
        )
        
        return success1 and success2 and success3

    def test_resume_edge_cases(self):
        """Test resume CRUD operations with edge cases"""
        print("\n🔍 Testing resume CRUD edge cases...")
        
        # Create resume with minimal data
        minimal_resume = {
            "locale": "US"
        }
        
        success1, response1 = self.run_test(
            "Create Minimal Resume",
            "POST",
            "resumes",
            200,
            data=minimal_resume
        )
        
        resume_id = response1.get("id") if success1 else None
        
        # Try to get non-existent resume
        success2, _ = self.run_test(
            "Get Non-existent Resume",
            "GET",
            "resumes/non-existent-id",
            404
        )
        
        # Try to update non-existent resume
        success3, _ = self.run_test(
            "Update Non-existent Resume",
            "PUT",
            "resumes/non-existent-id",
            404,
            data={"summary": "Updated summary"}
        )
        
        # Score non-existent resume
        success4, _ = self.run_test(
            "Score Non-existent Resume",
            "POST",
            "resumes/non-existent-id/score",
            404
        )
        
        return success1 and success2 and success3 and success4

def main():
    print("🚀 Starting AtlasCV Backend Edge Case Tests")
    print("=" * 60)
    
    tester = EdgeCaseAPITester()
    
    # Run all edge case tests
    edge_tests = [
        ("AI Empty Inputs", tester.test_ai_empty_inputs),
        ("AI Long Inputs", tester.test_ai_long_inputs),
        ("AI Invalid Payloads", tester.test_ai_invalid_payloads),
        ("AI Special Characters", tester.test_ai_special_characters),
        ("JD Edge Cases", tester.test_jd_edge_cases),
        ("Resume Edge Cases", tester.test_resume_edge_cases)
    ]
    
    passed_tests = 0
    for test_name, test_func in edge_tests:
        print(f"\n📋 {test_name.upper()}")
        print("=" * 40)
        
        if test_func():
            passed_tests += 1
            print(f"✅ {test_name} - All sub-tests passed")
        else:
            print(f"❌ {test_name} - Some sub-tests failed")
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Edge Case Results: {passed_tests}/{len(edge_tests)} test groups passed")
    print(f"📊 Individual Tests: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if passed_tests == len(edge_tests):
        print("🎉 All edge case tests passed!")
        return 0
    else:
        print("❌ Some edge case tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())