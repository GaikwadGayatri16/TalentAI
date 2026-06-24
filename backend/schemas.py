from pydantic import BaseModel, EmailStr
from typing import List, Optional
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
    password: str
    role: Optional[str] = "recruiter"  # default is recruiter, can be admin

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

# Job Schemas
class JobCreate(BaseModel):
    title: str
    company: str
    description: str
    required_skills: str  # Comma-separated
    preferred_skills: Optional[str] = ""  # Comma-separated
    experience_required: int

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
    resume_path: str
    parsed_text: Optional[str] = None

    class Config:
        from_attributes = True

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

# Score Schemas
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
    ats_breakdown: dict  # e.g., {"skills_score": 45, "experience_score": 15, "projects_score": 18, "education_score": 10}
    ai_summary: str
    strengths: List[str]
    weaknesses: List[str]
    missing_skills: List[str]
    hiring_recommendation: str  # Strong Hire, Hire, Consider, Reject
    learning_path: List[str]
    interview_questions: List[dict]  # List of {"question": str, "category": str, "suggested_answer": str}

# Chatbot RAG Schemas
class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str

# Analytics Dashboard Schemas
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
