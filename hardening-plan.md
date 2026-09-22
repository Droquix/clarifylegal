# ClarifyLegal foundation hardening

## Goal
Make real-provider legal analysis safer, more transparent, and more reliable before adding document comparison.

## Tasks
- [x] Replace misleading fallback analysis with a clear provider-configuration error → Verify: missing-key test returns 503.
- [x] Bound text/PDF inputs and validate PDF bytes/page count → Verify: API rejects over-limit requests.
- [x] Add untrusted-document boundaries and source-quote checks for analysis and Q&A → Verify: unsupported Q&A response is safely withheld.
- [x] Remove sensitive logs and upstream error details → Verify: error response contains no provider message.
- [x] Add third-party processing disclosure and Q&A source quotes in the interface → Verify: production build succeeds.
- [x] Update environment documentation and backend tests → Verify: test suite passes.

## Done When
- [x] The app makes no unsupported privacy or analysis claims.
- [x] Requests have enforceable server-side limits and source-grounded answers.
- [x] Automated tests and frontend build run successfully.
