/**
 * ClarifyLegal Frontend API Service
 *
 * Provides async fetch abstractions for file upload, text analysis,
 * grounded Q&A, and document comparison endpoints.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Uploads a document file (.pdf or .txt) for in-memory plain-English analysis.
 * @param {File} file - Selected document file object.
 * @returns {Promise<Object>} Analysis summary and clause breakdowns.
 */
export async function analyzeFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/analyze-file`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `File analysis failed (${response.status})`);
  }

  return await response.json();
}

/**
 * Submits raw contract text for plain-English analysis and risk scoring.
 * @param {string} text - User pasted contract text.
 * @returns {Promise<Object>} Analysis summary and clause breakdowns.
 */
export async function analyzeText(text) {
  const response = await fetch(`${API_BASE_URL}/api/analyze-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Text analysis failed (${response.status})`);
  }

  return await response.json();
}

/**
 * Submits a question grounded in the provided document text context.
 * @param {string} question - User question.
 * @param {string} documentText - Document text context.
 * @returns {Promise<Object>} Answer, lawyer follow-up questions, and disclaimer.
 */
export async function askQuestion(question, documentText) {
  const response = await fetch(`${API_BASE_URL}/api/qa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      document_text: documentText,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Q&A failed (${response.status})`);
  }

  return await response.json();
}

/**
 * Uploads original and revised document files for side-by-side comparison.
 * @param {File} originalFile - Original contract file.
 * @param {File} revisedFile - Revised contract file.
 * @returns {Promise<Object>} Comparison summary and clause change diffs.
 */
export async function compareFiles(originalFile, revisedFile) {
  const formData = new FormData();
  formData.append('original_file', originalFile);
  formData.append('revised_file', revisedFile);

  const response = await fetch(`${API_BASE_URL}/api/compare-files`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Document comparison failed (${response.status})`);
  }

  return await response.json();
}

/**
 * Submits original and revised contract text strings for side-by-side comparison.
 * @param {string} originalText - Original contract text.
 * @param {string} revisedText - Revised contract text.
 * @returns {Promise<Object>} Comparison summary and clause change diffs.
 */
export async function compareText(originalText, revisedText) {
  const response = await fetch(`${API_BASE_URL}/api/compare-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ original_text: originalText, revised_text: revisedText }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Document comparison failed (${response.status})`);
  }

  return await response.json();
}
