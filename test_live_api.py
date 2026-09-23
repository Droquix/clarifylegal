import time
import httpx
import json

LIVE_URL = "https://clarifylegal.vercel.app"

# Construct a realistic 28,500 character contract (under the 30,000 char limit)
paragraphs = [
    "CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT\n"
    "This Non-Disclosure Agreement ('Agreement') is entered into by and between Company Inc ('Disclosing Party') "
    "and Recipient LLC ('Receiving Party'). The Receiving Party agrees to maintain strict confidentiality of all Proprietary Information.",
    "Section 1. Obligation of Confidentiality. The Receiving Party shall hold all Confidential Information in strict confidence "
    "and shall not disclose any portion thereof to third parties without prior written approval. This obligation survives termination for 5 years.",
    "Section 2. Non-Compete and Non-Solicitation. For a period of two (2) years following termination, the Receiving Party shall not engage "
    "in any business competing directly with Disclosing Party within North America, nor solicit any employees or customers.",
    "Section 3. Indemnification and Remedies. Receiving Party agrees to indemnify, defend, and hold harmless Disclosing Party against any "
    "and all losses, damages, liabilities, and legal fees resulting from breach of this Agreement. Injunctive relief shall be available without bond.",
    "Section 4. Governing Law and Dispute Resolution. This Agreement shall be governed by Delaware law. Any disputes shall be submitted "
    "to binding arbitration in Wilmington, Delaware."
]

large_doc_text = "\n\n".join(paragraphs * 22)[:28500]
print(f"Generated test contract. Length: {len(large_doc_text):,} characters, {len(large_doc_text.split()):,} words.")

# Test 1: Live Document Analysis on 28,500 Character Contract
print("\n--- TEST 1: 28,500 Character Document Analysis ---")
start_time = time.time()
try:
    with httpx.Client(timeout=60.0) as client:
        res = client.post(
            f"{LIVE_URL}/api/analyze-text",
            json={"text": large_doc_text}
        )
        elapsed = time.time() - start_time
        print(f"HTTP Status: {res.status_code}")
        print(f"Total Time Taken: {elapsed:.2f} seconds")
        if res.status_code == 200:
            data = res.json()
            summary = data.get("summary", {})
            print(f"Document Type: {summary.get('document_type')}")
            print(f"Overall Risk Score: {summary.get('overall_risk_score')}")
            print(f"Extracted Clauses Count: {len(data.get('clauses', []))}")
            print("SUCCESS: 28,500 character document analyzed without timeout!")
        else:
            print(f"Error Response ({res.status_code}): {res.text[:300]}")
except Exception as e:
    print(f"Test 1 Exception: {e}")

# Test 2: Live Grounded Q&A Caching (First vs Second Request Speed)
print("\n--- TEST 2: Q&A In-Memory Response Caching Test ---")
qa_payload = {
    "question": "What is the non-compete duration and geographic scope?",
    "document_text": large_doc_text[:5000]
}

try:
    with httpx.Client(timeout=60.0) as client:
        t1_start = time.time()
        res1 = client.post(f"{LIVE_URL}/api/qa", json=qa_payload)
        t1_elapsed = time.time() - t1_start
        print(f"Request 1 Status: {res1.status_code} | Time: {t1_elapsed:.3f}s")

        t2_start = time.time()
        res2 = client.post(f"{LIVE_URL}/api/qa", json=qa_payload)
        t2_elapsed = time.time() - t2_start
        print(f"Request 2 Status: {res2.status_code} | Time: {t2_elapsed:.3f}s")

        if res1.status_code == 200 and res2.status_code == 200:
            speedup = t1_elapsed / max(t2_elapsed, 0.001)
            print(f"Cache Speedup Factor: {speedup:.1f}x faster!")
            print(f"Request 1 Answer Snippet: {res1.json().get('answer')[:100]}...")
            print(f"Request 2 Answer Snippet: {res2.json().get('answer')[:100]}...")
            if t2_elapsed < 0.5:
                print("SUCCESS: In-memory cache verified on live deployment!")
            else:
                print("NOTE: Second request took >0.5s (hit separate container or cold cache).")
except Exception as e:
    print(f"Test 2 Exception: {e}")
