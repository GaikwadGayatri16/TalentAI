from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# User Schemas
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    role: Optional[str] = "candidate"  # default is candidate, can be recruiter or admin

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

# Job Schemas
class JobCreate(BaseModel):
    title: str
    company: str
    description: str
    required_skills: str  # Comma-separated
    preferred_skills: Optional[str] = ""  # Comma-separated
    experience_required: int = 0

class JobResponse(BaseModel):
    id: int
    title: str
    company: str
    description: str
    required_skills: str
    preferred_skills: str
    experience_required: int
    created_by: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

# Skill Schemas
class SkillResponse(BaseModel):
    id: int
    skill_name: str

    class Config:
        from_attributes = True

# Candidate & Resume Schemas
class ResumeResponse(BaseModel):
    id: int
    candidate_id: Optional[int] = None
    user_id: Optional[int] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    resume_path: str
    is_active: Optional[int] = 1
    uploaded_at: Optional[datetime] = None
    parsed_text: Optional[str] = None

    class Config:
        from_attributes = True

class ResumeDetailResponse(BaseModel):
    id: int
    file_name: Optional[str]
    file_type: Optional[str]
    is_active: int
    uploaded_at: Optional[datetime]
    parsed_json: Optional[Dict[str, Any]] = None
    parsed_text: Optional[str] = None

class CandidateResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    experience: int
    education: Optional[str] = None
    created_at: datetime
    skills: List[SkillResponse] = []

    class Config:
        from_attributes = True

# Candidate Score Schemas (Recruiter Flow)
class CandidateScoreResponse(BaseModel):
    id: int
    candidate_id: int
    job_id: int
    ats_score: float
    similarity_score: float
    final_score: float
    rank: Optional[int]

    class Config:
        from_attributes = True

class CandidateRankedResponse(BaseModel):
    rank: int
    candidate_id: int
    candidate_name: str
    candidate_email: Optional[str]
    candidate_experience: int
    candidate_education: Optional[str]
    ats_score: float
    similarity_score: float
    final_score: float

class CandidateEvaluationDetail(BaseModel):
    candidate_id: int
    job_id: int
    ats_score: float
    similarity_score: float
    final_score: float
    rank: int
    ats_breakdown: dict
    ai_summary: str
    strengths: List[str]
    weaknesses: List[str]
    missing_skills: List[str]
    hiring_recommendation: str
    learning_path: List[str]
    interview_questions: List[dict]

# Resume Comprehensive Analysis Schemas
class ResumeAnalysisResponse(BaseModel):
    id: Optional[int] = None
    resume_id: int
    overall_score: float
    structure_score: float
    content_score: float
    skills_score: float
    experience_score: float
    education_score: float
    readability_score: float
    ats_score: float
    ats_details: Dict[str, Any]
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[str]
    section_scores: Dict[str, float]
    created_at: Optional[datetime] = None

# Job Matching Schemas
class JobMatchRequest(BaseModel):
    resume_id: Optional[int] = None
    job_id: Optional[int] = None
    job_title: Optional[str] = ""
    job_company: Optional[str] = ""
    job_description: Optional[str] = ""
    required_skills: Optional[str] = ""
    preferred_skills: Optional[str] = ""
    experience_required: Optional[int] = 0

class JobMatchResponse(BaseModel):
    id: Optional[int] = None
    resume_id: int
    job_id: Optional[int] = None
    job_title: str
    job_company: Optional[str] = None
    job_description: str
    overall_match_score: float
    skill_match_score: float
    semantic_match_score: float
    experience_match_score: float
    matched_skills: List[str]
    missing_skills: List[str]
    matched_preferred: List[str] = []
    skill_gap_analysis: List[str]
    created_at: Optional[datetime] = None

# Conversation & Chatbot Schemas
class ConversationCreate(BaseModel):
    resume_id: Optional[int] = None
    title: Optional[str] = "Career Assistant Chat"

class ConversationResponse(BaseModel):
    id: int
    user_id: int
    resume_id: Optional[int]
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True

class ChatMessageCreate(BaseModel):
    message: str

class ChatMessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender: str
    message: str
    sources: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str

# Resume Improvement Schemas
class ResumeImproveRequest(BaseModel):
    section_type: str # "summary", "project", "experience_bullet"
    content: str
    target_role: Optional[str] = ""

class ResumeImproveResponse(BaseModel):
    original: str
    improved: str
    key_changes: List[str]
    action_verbs_used: List[str]

# Interview Prep Schemas
class InterviewPrepRequest(BaseModel):
    resume_id: Optional[int] = None
    target_role: str
    job_description: Optional[str] = ""

class InterviewPrepResponse(BaseModel):
    id: Optional[int] = None
    resume_id: Optional[int]
    target_role: str
    job_description: Optional[str] = ""
    questions: List[Dict[str, Any]]
    created_at: Optional[datetime] = None

# Candidate Dashboard Schema
class CandidateDashboardResponse(BaseModel):
    total_resumes: int
    active_resume: Optional[Dict[str, Any]] = None
    latest_analysis: Optional[Dict[str, Any]] = None
    total_matches: int
    total_conversations: int
    top_skills: List[str]
    recent_matches: List[Dict[str, Any]]
    recent_conversations: List[Dict[str, Any]]

# Recruiter Analytics Dashboard Schemas
class SkillDistributionItem(BaseModel):
    skill_name: str
    count: int

class ScoreDistributionItem(BaseModel):
    range: str
    count: int

class StatusFunnelItem(BaseModel):
    stage: str
    count: int

class DashboardAnalyticsResponse(BaseModel):
    total_jobs: int
    total_candidates: int
    average_ats_score: float
    top_skills: List[SkillDistributionItem]
    candidate_distribution: List[StatusFunnelItem]
    ats_distribution: List[ScoreDistributionItem]
