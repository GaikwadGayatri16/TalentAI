import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float, Table
from sqlalchemy.orm import relationship
from backend.database import Base

# Association Table for Candidate skills relationship
candidate_skills = Table(
    "candidate_skills",
    Base.metadata,
    Column("candidate_id", Integer, ForeignKey("candidates.id", ondelete="CASCADE"), primary_key=True),
    Column("skill_id", Integer, ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="recruiter") # admin or recruiter
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    jobs = relationship("Job", back_populates="creator")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    company = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    required_skills = Column(Text, nullable=True) # JSON or comma-separated list of skills
    preferred_skills = Column(Text, nullable=True) # JSON or comma-separated list of skills
    experience_required = Column(Integer, default=0) # in years
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    creator = relationship("User", back_populates="jobs")
    scores = relationship("CandidateScore", back_populates="job", cascade="all, delete-orphan")

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=True)
    phone = Column(String(50), nullable=True)
    experience = Column(Integer, default=0) # Total years of experience
    education = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    resume = relationship("Resume", back_populates="candidate", uselist=False, cascade="all, delete-orphan")
    skills = relationship("Skill", secondary=candidate_skills, back_populates="candidates")
    scores = relationship("CandidateScore", back_populates="candidate", cascade="all, delete-orphan")

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), unique=True)
    resume_path = Column(String(255), nullable=False)
    parsed_text = Column(Text, nullable=True)

    candidate = relationship("Candidate", back_populates="resume")

class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    skill_name = Column(String(100), unique=True, index=True, nullable=False)

    candidates = relationship("Candidate", secondary=candidate_skills, back_populates="skills")

class CandidateScore(Base):
    __tablename__ = "candidate_scores"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    ats_score = Column(Float, default=0.0)
    similarity_score = Column(Float, default=0.0)
    final_score = Column(Float, default=0.0)
    rank = Column(Integer, nullable=True)
    hiring_recommendation = Column(String(50), default="Consider")
    evaluation_json = Column(Text, nullable=True) # Cached JSON of Gemini evaluations

    candidate = relationship("Candidate", back_populates="scores")
    job = relationship("Job", back_populates="scores")
