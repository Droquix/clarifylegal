"""
ClarifyLegal Pydantic Schemas & Data Models

Defines input/output schemas, enums, metadata fields, and disclaimer defaults
for FastAPI endpoints and service layer integrations.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class ClauseCategory(str, Enum):
    OBLIGATIONS_AND_LIABILITIES = "obligations_and_liabilities"
    RED_FLAGS = "red_flags"
    STANDARD_AND_BOILERPLATE = "standard_and_boilerplate"
    TERMINATION_AND_RENEWAL = "termination_and_renewal"
    FINANCIAL_AND_PAYMENT = "financial_and_payment"

class ClauseBreakdown(BaseModel):
    id: str = Field(..., description="Unique identifier for the clause, e.g. clause-1")
    title: str = Field(..., description="Short descriptive title of the clause")
    category: ClauseCategory = Field(..., description="Classification category of the clause")
    risk_level: RiskLevel = Field(..., description="Risk assessment level")
    original_text: str = Field(..., description="Verbatim quote or excerpt from the document")
    plain_english: str = Field(..., description="Informational explanation in simple English")
    potential_impact: str = Field(..., description="Informational summary of potential implications")
    lawyer_questions: List[str] = Field(default_factory=list, description="Suggested questions for a legal professional")

class DocumentMetadata(BaseModel):
    effective_date: Optional[str] = Field(None, description="Identified effective or execution date")
    governing_law: Optional[str] = Field(None, description="Jurisdiction or governing law mentioned")
    parties_involved: List[str] = Field(default_factory=list, description="Parties identified in contract")
    key_deadlines: List[str] = Field(default_factory=list, description="Important dates, notice periods, or deadlines")
    financial_terms: List[str] = Field(default_factory=list, description="Fees, rent, penalties, or payment obligations")

class DocumentSummary(BaseModel):
    document_type: str = Field(..., description="Type of document, e.g., Non-Disclosure Agreement")
    executive_summary: str = Field(..., description="High-level plain-English overview")
    overall_risk_score: RiskLevel = Field(..., description="Overall risk rating of the document")
    risk_rationale: str = Field(..., description="Brief explanation of the overall risk rating")
    word_count: int = Field(0, description="Total word count of parsed document text")
    metadata: DocumentMetadata = Field(default_factory=DocumentMetadata)

class AnalysisResponse(BaseModel):
    summary: DocumentSummary
    clauses: List[ClauseBreakdown]
    extracted_text: Optional[str] = Field(None, description="Cleaned extracted text of the document")
    disclaimer: str = Field(
        default="ClarifyLegal provides informational breakdowns only and does NOT provide legal advice. "
                "No attorney-client relationship is formed. Please consult a licensed attorney for binding legal guidance.",
        description="Mandatory legal disclaimer"
    )
    processing_time_seconds: float = Field(0.0, description="Time taken to parse and analyze")

class QARequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=1000, description="User question about the document")
    document_text: str = Field(..., min_length=10, max_length=30000, description="In-memory document text context")

class QAResponse(BaseModel):
    question: str
    answer: str = Field(..., description="Informational answer grounded in document text")
    lawyer_followups: List[str] = Field(default_factory=list, description="Suggested questions for an attorney")
    citations: List[str] = Field(default_factory=list, description="Verbatim document excerpts supporting the answer")
    disclaimer: str = Field(
        default="Informational guidance only — not legal advice. Consult a qualified attorney for specific legal counsel."
    )

class ChangeType(str, Enum):
    ADDED = "added"
    REMOVED = "removed"
    MODIFIED = "modified"

class RiskDirection(str, Enum):
    INCREASED = "increased"
    DECREASED = "decreased"
    UNCHANGED = "unchanged"

class DocumentComparisonRequest(BaseModel):
    original_text: str = Field(..., min_length=20, max_length=30000)
    revised_text: str = Field(..., min_length=20, max_length=30000)

class DocumentChange(BaseModel):
    id: str
    change_type: ChangeType
    title: str
    category: ClauseCategory
    risk_direction: RiskDirection
    original_text: Optional[str] = None
    revised_text: Optional[str] = None
    plain_english_impact: str
    lawyer_questions: List[str] = Field(default_factory=list)

class ComparisonSummary(BaseModel):
    overview: str
    material_change_count: int = Field(ge=0)
    higher_risk_changes: int = Field(ge=0)

class ComparisonResponse(BaseModel):
    summary: ComparisonSummary
    changes: List[DocumentChange]
    disclaimer: str = Field(
        default="ClarifyLegal provides informational document comparisons only and does NOT provide legal advice."
    )
    processing_time_seconds: float = Field(0.0)
