"""Local test for cloud function."""
import json
from index import main

# --- Test 1: CORS preflight ---
print("=" * 50)
print("Test 1: CORS preflight (OPTIONS)")
print("=" * 50)
options_event = {"httpMethod": "OPTIONS"}
options_result = main(options_event, None)
print(f"CORS Status: {options_result['statusCode']}")
print(f"CORS Headers: {options_result['headers']}")
print()

# --- Test 2: POST with brain state ---
print("=" * 50)
print("Test 2: POST brain state (focused)")
print("=" * 50)
event = {
    "httpMethod": "POST",
    "body": json.dumps({
        "state": "focused",
        "confidence": 0.87,
        "bands": {
            "delta": 0.04,
            "theta": 0.04,
            "alpha": 0.08,
            "beta": 0.55,
            "gamma": 0.30,
        },
        "message": "",
    }),
}

result = main(event, None)
print(f"Status: {result['statusCode']}")
print(f"Body: {result['body']}")
