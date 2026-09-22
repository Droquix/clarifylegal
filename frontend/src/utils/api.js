/**
 * ClarifyLegal Frontend API Service
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

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
