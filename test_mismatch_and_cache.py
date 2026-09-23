import json
from backend.services.ai_service import (
    compare_documents_with_ai,
    answer_question_with_ai,
    response_cache
)

employment_doc = """
EMPLOYMENT AGREEMENT
This Employment Agreement ('Agreement') is entered into between Acme Corp ('Employer') and John Doe ('Employee').
Section 1. Job Title and Salary. Employee is hired as Senior Software Engineer at an annual salary of $160,000.
Section 2. Termination. Either employer or employee may terminate this employment agreement with 30 days written notice.
"""

loan_doc = """
PERSONAL LOAN AGREEMENT AND PROMISSORY NOTE
This Personal Loan Agreement ('Agreement') is entered into between Financial Bank ('Lender') and Jane Smith ('Borrower').
Section 1. Principal Amount and Interest Rate. Lender agrees to lend Borrower the principal amount of $25,000 at an annual interest rate of 6.5%.
Section 2. Repayment Terms. Borrower agrees to make monthly payments on the 1st of each month for 36 months.
"""

lease_doc = """
RESIDENTIAL LEASE AGREEMENT
This Residential Lease Agreement is between Landlord Properties ('Landlord') and Alice Johnson ('Tenant').
Section 1. Rent Amount. Tenant agrees to pay monthly rent of $2,500 due on the first day of each month.
Section 2. Security Deposit. Tenant shall provide a security deposit of $2,500 upon execution of this lease.
"""

print("==================================================================")
print("TEST 1: DOCUMENT TYPE MISMATCH TEST (Employment vs Personal Loan)")
print("==================================================================")

mismatch_result = compare_documents_with_ai(employment_doc, loan_doc)
print("Comparison Result JSON Payload:")
print(json.dumps(mismatch_result, indent=2))

assert mismatch_result["summary"]["material_change_count"] == 0
assert len(mismatch_result["changes"]) == 0
assert "Document Type Mismatch" in mismatch_result["summary"]["overview"]
print("\nPASSED TEST 1: Unrelated contract types refused with 0 fake diffs and clear overview message!")

print("\n==================================================================")
print("TEST 2: RESPONSE CACHE KEY ISOLATION ACROSS DIFFERENT DOCUMENTS")
print("==================================================================")

# Clear cache first
response_cache._cache.clear()

same_question = "What is the primary financial term or compensation amount in this agreement?"

# Query Document A (Employment Doc - Salary $160,000)
ans_a = answer_question_with_ai(same_question, employment_doc)
print(f"Document A Answer: {ans_a.get('answer')}")

# Query Document B (Lease Doc - Rent $2,500)
ans_b = answer_question_with_ai(same_question, lease_doc)
print(f"Document B Answer: {ans_b.get('answer')}")

assert "$160,000" in ans_a.get("answer")
assert "$2,500" in ans_b.get("answer")
assert ans_a.get("answer") != ans_b.get("answer")

print("\nPASSED TEST 2: Cache keys incorporate FULL document text! Different documents return distinct answers for identical questions!")
