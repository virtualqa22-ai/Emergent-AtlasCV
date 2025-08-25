#!/usr/bin/env python3

import requests
import json

# Test the resume creation endpoint directly
base_url = "https://continue-phase-ten.preview.emergentagent.com/api"

# Test data
resume_data = {
    "locale": "IN",
    "contact": {
        "full_name": "Test User",
        "email": "test@example.com",
        "phone": "+91 9876543210"
    },
    "summary": "Test summary",
    "skills": ["Python", "FastAPI"]
}

print("Testing resume creation endpoint...")
print(f"URL: {base_url}/resumes")
print(f"Data: {json.dumps(resume_data, indent=2)}")

try:
    response = requests.post(
        f"{base_url}/resumes",
        json=resume_data,
        headers={'Content-Type': 'application/json'},
        timeout=10
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 422:
        print("\n422 Error - Validation issue. Let's check the error details:")
        try:
            error_data = response.json()
            print(json.dumps(error_data, indent=2))
        except:
            print("Could not parse error JSON")
            
except Exception as e:
    print(f"Error: {e}")