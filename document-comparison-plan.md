# Document comparison

## Goal
Let a user compare original and revised legal documents, see source-backed changes, and understand their possible informational impact.

## Tasks
- [ ] Add comparison schemas and a provider-backed, source-grounded comparison service → Verify: changes without an original or revised excerpt are removed.
- [ ] Add text and PDF/TXT comparison endpoints with the existing upload limits → Verify: both routes return a validated comparison response.
- [ ] Add Original/Revised upload and paste workflow with provider acknowledgement → Verify: each input mode blocks submission until complete and acknowledged.
- [ ] Add a comparison dashboard for additions, removals, modifications, risk direction, and lawyer questions → Verify: frontend production build completes.
- [ ] Add backend tests for provider configuration, source grounding, and endpoint validation → Verify: full backend test suite passes.

## Done When
- [ ] Users can compare two documents without claiming legal advice.
- [ ] Every displayed change shows text from at least one supplied document.
- [ ] Backend tests and production frontend build pass.
