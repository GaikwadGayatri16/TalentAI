import os
import shutil
import json
import random
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.config import settings
from backend.database import engine, get_db, Base
from backend.models import (
    User, Job, Candidate, Resume, Skill, CandidateScore, candidate_skills,
    ResumeAnalysis, JobMatch, Conversation, ChatMessage, InterviewPrep
)
from backend.schemas import (
    UserCreate, UserResponse, Token, UserLogin, UserProfileUpdate,
    JobCreate, JobResponse,
    CandidateRankedResponse, CandidateEvaluationDetail,
    ChatRequest, ChatResponse, DashboardAnalyticsResponse,
    SkillDistributionItem, ScoreDistributionItem, StatusFunnelItem,
    ResumeResponse, ResumeDetailResponse, ResumeAnalysisResponse,
    JobMatchRequest, JobMatchResponse,
    ConversationCreate, ConversationResponse, ChatMessageCreate, ChatMessageResponse,
    ResumeImproveRequest, ResumeImproveResponse,
    InterviewPrepRequest, InterviewPrepResponse, CandidateDashboardResponse
)
from backend.auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, RoleChecker
)
from backend.parser import parse_resume, validate_resume_file, DocumentParsingError
from backend.nlp import (
    extract_name, extract_email, extract_phone, extract_skills,
    extract_experience_years, extract_education, calculate_ats_score,
    compute_semantic_similarity, evaluate_candidate_with_gemini, ask_resume_chatbot,
    extract_structured_resume, analyze_resume_comprehensive, match_resume_to_job,
    chat_career_assistant, generate_resume_improvement, generate_personalized_interview_prep
)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# --- Authentication Endpoints ---
# ==========================================

@app.post(f"{settings.API_V1_STR}/auth/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    """Registers a new user (Candidate, Recruiter, or Admin)."""
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
    
    role = user_in.role if user_in.role in ["candidate", "recruiter", "admin"] else "candidate"
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        name=user_in.name.strip(),
        email=user_in.email.strip().lower(),
        password_hash=hashed_password,
        role=role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # If registered as candidate, create linked Candidate profile if one doesn't exist
    if role == "candidate":
        cand = db.query(Candidate).filter(Candidate.email == new_user.email).first()
        if not cand:
            cand = Candidate(
                user_id=new_user.id,
                name=new_user.name,
                email=new_user.email
            )
            db.add(cand)
            db.commit()
        else:
            cand.user_id = new_user.id
            db.commit()

    return new_user

@app.post(f"{settings.API_V1_STR}/auth/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    """Authenticates user and returns JWT access token."""
    user = db.query(User).filter(User.email == user_in.email.strip().lower()).first()
    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    
    access_token = create_access_token(data={"sub": user.email, "role": user.role, "id": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name
    }

@app.get(f"{settings.API_V1_STR}/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns profile of currently authenticated user."""
    return current_user

@app.put(f"{settings.API_V1_STR}/auth/profile", response_model=UserResponse)
def update_profile(profile_in: UserProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Updates user profile information or password."""
    if profile_in.name:
        current_user.name = profile_in.name.strip()
    if profile_in.email and profile_in.email != current_user.email:
        existing = db.query(User).filter(User.email == profile_in.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="This email is already in use by another account.")
        current_user.email = profile_in.email.strip().lower()
    
    if profile_in.new_password:
        if not profile_in.current_password or not verify_password(profile_in.current_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Current password verification failed.")
        if len(profile_in.new_password) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
        current_user.password_hash = get_password_hash(profile_in.new_password)
        
    db.commit()
    db.refresh(current_user)
    return current_user

@app.post(f"{settings.API_V1_STR}/auth/token", response_model=Token)
def swagger_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """OAuth2-compatible login for Swagger UI."""
    user = db.query(User).filter(
        User.email == form_data.username.strip().lower()
    ).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    access_token = create_access_token(
        data={"sub": user.email, "role": user.role, "id": user.id}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name
    }
# ==========================================
# --- Candidate Resume Management Endpoints ---
# ==========================================

@app.post(f"{settings.API_V1_STR}/resumes/upload", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_personal_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Candidate or User uploads their personal resume (PDF, DOCX, TXT).
    Parses text, extracts structured JSON, and generates immediate baseline analysis.
    """
    file_bytes = await file.read()
    file_size = len(file_bytes)

    try:
        ext = validate_resume_file(file.filename, file_size)
    except DocumentParsingError as de:
        raise HTTPException(status_code=400, detail=str(de))

    safe_filename = f"user_{current_user.id}_{random.randint(100000, 999999)}{ext}"
    save_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

    with open(save_path, "wb") as buffer:
        buffer.write(file_bytes)

    try:
        parsed_text = parse_resume(save_path)
    except Exception as e:
        if os.path.exists(save_path):
            os.remove(save_path)
        raise HTTPException(status_code=400, detail=f"Failed to extract text from document: {str(e)}")

    if not parsed_text or not parsed_text.strip():
        if os.path.exists(save_path):
            os.remove(save_path)
        raise HTTPException(status_code=400, detail="No readable text found in document.")

    # Extract structured information
    structured_data = extract_structured_resume(parsed_text)

    # Set prior resumes of this user to inactive
    db.query(Resume).filter(Resume.user_id == current_user.id).update({"is_active": 0})

    # Find or create candidate record for this user
    cand = db.query(Candidate).filter(
        (Candidate.user_id == current_user.id) | (Candidate.email == current_user.email)
    ).first()

    name = structured_data["personal_info"].get("name") or current_user.name
    email = structured_data["personal_info"].get("email") or current_user.email
    phone = structured_data["personal_info"].get("phone")
    exp = structured_data["experience"].get("estimated_years", 0)
    edu = structured_data["education"].get("degree_level", "")

    if not cand:
        cand = Candidate(
            user_id=current_user.id,
            name=name,
            email=email,
            phone=phone,
            experience=exp,
            education=edu
        )
        db.add(cand)
        db.flush()
    else:
        cand.user_id = current_user.id
        cand.name = name or cand.name
        cand.phone = phone or cand.phone
        cand.experience = max(exp, cand.experience)
        cand.education = edu or cand.education
        db.flush()

    # Link technical skills
    for skill_name in structured_data["skills"]["all_skills"]:
        sk = db.query(Skill).filter(Skill.skill_name == skill_name).first()
        if not sk:
            sk = Skill(skill_name=skill_name)
            db.add(sk)
            db.flush()
        if sk not in cand.skills:
            cand.skills.append(sk)

    # Save new resume record
    new_resume = Resume(
        user_id=current_user.id,
        candidate_id=cand.id,
        file_name=file.filename,
        file_type=file.content_type or ext,
        resume_path=save_path,
        parsed_text=parsed_text,
        parsed_json=json.dumps(structured_data),
        is_active=1
    )
    db.add(new_resume)
    db.flush()

    # Generate initial comprehensive analysis
    analysis_data = analyze_resume_comprehensive(parsed_text, structured_data)
    new_analysis = ResumeAnalysis(
        resume_id=new_resume.id,
        user_id=current_user.id,
        overall_score=analysis_data["overall_score"],
        structure_score=analysis_data["section_scores"]["structure"],
        content_score=analysis_data["section_scores"]["content"],
        skills_score=analysis_data["section_scores"]["skills"],
        experience_score=analysis_data["section_scores"]["experience"],
        education_score=analysis_data["section_scores"]["readability"], # readability proxy
        readability_score=analysis_data["section_scores"]["readability"],
        ats_score=analysis_data["ats_readiness"]["score"],
        ats_details_json=json.dumps(analysis_data["ats_readiness"]["details"]),
        strengths_json=json.dumps(analysis_data["strengths"]),
        weaknesses_json=json.dumps(analysis_data["weaknesses"]),
        suggestions_json=json.dumps(analysis_data["suggestions"]),
        section_scores_json=json.dumps(analysis_data["section_scores"]),
        raw_analysis_json=json.dumps(analysis_data)
    )
    db.add(new_analysis)
    db.commit()
    db.refresh(new_resume)

    return new_resume

@app.get(f"{settings.API_V1_STR}/resumes", response_model=List[ResumeResponse])
def get_user_resumes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Lists all resumes uploaded by the current user."""
    return db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.uploaded_at.desc()).all()

@app.get(f"{settings.API_V1_STR}/resumes/{{resume_id}}", response_model=ResumeDetailResponse)
def get_resume_detail(resume_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retrieves full resume details including structured JSON and text."""
    res = db.query(Resume).filter(Resume.id == resume_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Resume not found.")
    
    # Ownership or admin/recruiter check
    if res.user_id != current_user.id and current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this resume.")

    parsed_json_dict = {}
    if res.parsed_json:
        try:
            parsed_json_dict = json.loads(res.parsed_json)
        except Exception:
            pass

    return {
        "id": res.id,
        "file_name": res.file_name,
        "file_type": res.file_type,
        "is_active": res.is_active or 1,
        "uploaded_at": res.uploaded_at,
        "parsed_json": parsed_json_dict,
        "parsed_text": res.parsed_text
    }

@app.put(f"{settings.API_V1_STR}/resumes/{{resume_id}}/activate")
def set_active_resume(resume_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Sets the specified resume as the user's primary active resume."""
    res = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Resume not found.")
    
    db.query(Resume).filter(Resume.user_id == current_user.id).update({"is_active": 0})
    res.is_active = 1
    db.commit()
    return {"message": "Active resume updated successfully."}

@app.delete(f"{settings.API_V1_STR}/resumes/{{resume_id}}")
def delete_resume(resume_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Deletes an uploaded resume."""
    res = db.query(Resume).filter(Resume.id == resume_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if res.user_id != current_user.id and current_user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this resume.")
    
    if os.path.exists(res.resume_path):
        try:
            os.remove(res.resume_path)
        except Exception:
            pass

    db.delete(res)
    db.commit()
    return {"message": "Resume deleted successfully."}


# ==========================================
# --- Resume Comprehensive & ATS Analysis ---
# ==========================================

@app.get(f"{settings.API_V1_STR}/resumes/{{resume_id}}/analysis", response_model=ResumeAnalysisResponse)
def get_resume_analysis(resume_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Gets or generates comprehensive multi-metric analysis for a resume."""
    res = db.query(Resume).filter(Resume.id == resume_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Resume not found.")
    
    if res.user_id != current_user.id and current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this analysis.")

    analysis = db.query(ResumeAnalysis).filter(ResumeAnalysis.resume_id == resume_id).order_by(ResumeAnalysis.created_at.desc()).first()

    if not analysis:
        # Generate analysis on the fly
        structured = json.loads(res.parsed_json) if res.parsed_json else extract_structured_resume(res.parsed_text or "")
        data = analyze_resume_comprehensive(res.parsed_text or "", structured)
        
        analysis = ResumeAnalysis(
            resume_id=res.id,
            user_id=res.user_id or current_user.id,
            overall_score=data["overall_score"],
            structure_score=data["section_scores"]["structure"],
            content_score=data["section_scores"]["content"],
            skills_score=data["section_scores"]["skills"],
            experience_score=data["section_scores"]["experience"],
            education_score=data["section_scores"]["readability"],
            readability_score=data["section_scores"]["readability"],
            ats_score=data["ats_readiness"]["score"],
            ats_details_json=json.dumps(data["ats_readiness"]["details"]),
            strengths_json=json.dumps(data["strengths"]),
            weaknesses_json=json.dumps(data["weaknesses"]),
            suggestions_json=json.dumps(data["suggestions"]),
            section_scores_json=json.dumps(data["section_scores"]),
            raw_analysis_json=json.dumps(data)
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

    return {
        "id": analysis.id,
        "resume_id": analysis.resume_id,
        "overall_score": analysis.overall_score,
        "structure_score": analysis.structure_score,
        "content_score": analysis.content_score,
        "skills_score": analysis.skills_score,
        "experience_score": analysis.experience_score,
        "education_score": analysis.education_score,
        "readability_score": analysis.readability_score,
        "ats_score": analysis.ats_score,
        "ats_details": json.loads(analysis.ats_details_json) if analysis.ats_details_json else {},
        "strengths": json.loads(analysis.strengths_json) if analysis.strengths_json else [],
        "weaknesses": json.loads(analysis.weaknesses_json) if analysis.weaknesses_json else [],
        "suggestions": json.loads(analysis.suggestions_json) if analysis.suggestions_json else [],
        "section_scores": json.loads(analysis.section_scores_json) if analysis.section_scores_json else {},
        "created_at": analysis.created_at
    }


# ==========================================
# --- Job Matching & Skill-Gap Endpoints ---
# ==========================================

@app.post(f"{settings.API_V1_STR}/jobs/match", response_model=JobMatchResponse)
def match_resume_with_job(
    req: JobMatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Matches candidate resume against an existing job or custom pasted job description.
    Computes skill match, semantic similarity, experience alignment, and tailored recommendations.
    """
    # 1. Resolve Resume
    if req.resume_id:
        resume = db.query(Resume).filter(Resume.id == req.resume_id).first()
    else:
        # Use user's active resume
        resume = db.query(Resume).filter(Resume.user_id == current_user.id, Resume.is_active == 1).first()
        if not resume:
            resume = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.uploaded_at.desc()).first()

    if not resume:
        raise HTTPException(
            status_code=400,
            detail="No resume found. Please upload a resume before matching against jobs."
        )

    # 2. Resolve Job Details
    job_title = req.job_title
    job_company = req.job_company
    job_description = req.job_description
    required_skills = req.required_skills
    preferred_skills = req.preferred_skills
    req_exp = req.experience_required or 0

    if req.job_id:
        db_job = db.query(Job).filter(Job.id == req.job_id).first()
        if db_job:
            job_title = db_job.title
            job_company = db_job.company
            job_description = db_job.description
            required_skills = db_job.required_skills or ""
            preferred_skills = db_job.preferred_skills or ""
            req_exp = db_job.experience_required or 0

    if not job_description or len(job_description.strip()) < 20:
        raise HTTPException(status_code=400, detail="Please provide a valid job description (at least 20 characters).")

    # 3. Run Matching Engine
    match_result = match_resume_to_job(
        resume_text=resume.parsed_text or "",
        job_description=job_description,
        job_title=job_title or "Target Role",
        required_skills_str=required_skills or "",
        preferred_skills_str=preferred_skills or "",
        req_exp=req_exp
    )

    # 4. Save Match Record
    match_record = JobMatch(
        resume_id=resume.id,
        user_id=current_user.id,
        job_id=req.job_id,
        job_title=job_title or "Target Position",
        job_company=job_company,
        job_description=job_description,
        overall_match_score=match_result["overall_match_score"],
        skill_match_score=match_result["skill_match_score"],
        semantic_match_score=match_result["semantic_match_score"],
        experience_match_score=match_result["experience_match_score"],
        matched_skills_json=json.dumps(match_result["matched_skills"]),
        missing_skills_json=json.dumps(match_result["missing_skills"]),
        skill_gap_json=json.dumps(match_result["skill_gap_analysis"]),
        recommendations_json=json.dumps(match_result["skill_gap_analysis"])
    )
    db.add(match_record)
    db.commit()
    db.refresh(match_record)

    return {
        "id": match_record.id,
        "resume_id": resume.id,
        "job_id": req.job_id,
        "job_title": match_record.job_title,
        "job_company": match_record.job_company,
        "job_description": match_record.job_description,
        "overall_match_score": match_record.overall_match_score,
        "skill_match_score": match_record.skill_match_score,
        "semantic_match_score": match_record.semantic_match_score,
        "experience_match_score": match_record.experience_match_score,
        "matched_skills": match_result["matched_skills"],
        "missing_skills": match_result["missing_skills"],
        "matched_preferred": match_result.get("matched_preferred", []),
        "skill_gap_analysis": match_result["skill_gap_analysis"],
        "created_at": match_record.created_at
    }

@app.get(f"{settings.API_V1_STR}/jobs/matches", response_model=List[JobMatchResponse])
def get_user_job_matches(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns past job matches for the authenticated user."""
    matches = db.query(JobMatch).filter(JobMatch.user_id == current_user.id).order_by(JobMatch.created_at.desc()).limit(20).all()
    results = []
    for m in matches:
        results.append({
            "id": m.id,
            "resume_id": m.resume_id,
            "job_id": m.job_id,
            "job_title": m.job_title,
            "job_company": m.job_company,
            "job_description": m.job_description,
            "overall_match_score": m.overall_match_score,
            "skill_match_score": m.skill_match_score,
            "semantic_match_score": m.semantic_match_score,
            "experience_match_score": m.experience_match_score,
            "matched_skills": json.loads(m.matched_skills_json) if m.matched_skills_json else [],
            "missing_skills": json.loads(m.missing_skills_json) if m.missing_skills_json else [],
            "matched_preferred": [],
            "skill_gap_analysis": json.loads(m.skill_gap_json) if m.skill_gap_json else [],
            "created_at": m.created_at
        })
    return results


# ==========================================
# --- AI Career Assistant (Multi-Turn RAG) ---
# ==========================================

@app.get(f"{settings.API_V1_STR}/conversations", response_model=List[ConversationResponse])
def get_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Lists conversations belonging to current user."""
    convs = db.query(Conversation).filter(Conversation.user_id == current_user.id).order_by(Conversation.updated_at.desc()).all()
    res = []
    for c in convs:
        msg_count = db.query(ChatMessage).filter(ChatMessage.conversation_id == c.id).count()
        res.append({
            "id": c.id,
            "user_id": c.user_id,
            "resume_id": c.resume_id,
            "title": c.title,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "message_count": msg_count
        })
    return res

@app.post(f"{settings.API_V1_STR}/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(req: ConversationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Creates a new conversation session."""
    resume_id = req.resume_id
    if not resume_id:
        active_res = db.query(Resume).filter(Resume.user_id == current_user.id, Resume.is_active == 1).first()
        if active_res:
            resume_id = active_res.id

    new_conv = Conversation(
        user_id=current_user.id,
        resume_id=resume_id,
        title=req.title or "Career Assistant Chat"
    )
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)

    # Add initial greeting message
    greeting = ChatMessage(
        conversation_id=new_conv.id,
        sender="assistant",
        message="Hello! I am your AI Career Assistant. I have loaded your resume context. Ask me anything, such as how to improve your projects, what skills to learn for a specific role, or how to prepare for interviews!"
    )
    db.add(greeting)
    db.commit()

    return {
        "id": new_conv.id,
        "user_id": new_conv.user_id,
        "resume_id": new_conv.resume_id,
        "title": new_conv.title,
        "created_at": new_conv.created_at,
        "updated_at": new_conv.updated_at,
        "message_count": 1
    }

@app.get(f"{settings.API_V1_STR}/conversations/{{conversation_id}}/messages", response_model=List[ChatMessageResponse])
def get_conversation_messages(conversation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retrieves full message history for a conversation."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or conv.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    msgs = db.query(ChatMessage).filter(ChatMessage.conversation_id == conversation_id).order_by(ChatMessage.created_at.asc()).all()
    results = []
    for m in msgs:
        results.append({
            "id": m.id,
            "conversation_id": m.conversation_id,
            "sender": m.sender,
            "message": m.message,
            "sources": json.loads(m.sources_json) if m.sources_json else [],
            "created_at": m.created_at
        })
    return results

@app.post(f"{settings.API_V1_STR}/conversations/{{conversation_id}}/messages", response_model=ChatMessageResponse)
def send_chat_message(
    conversation_id: int,
    req: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sends message to AI Career Assistant.
    Retrieves candidate's resume context, maintains multi-turn conversation memory,
    and returns Gemini generative response.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or conv.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    user_text = req.message.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Save user message
    user_msg = ChatMessage(
        conversation_id=conversation_id,
        sender="user",
        message=user_text
    )
    db.add(user_msg)
    db.commit()

    # Resolve resume context
    resume = None
    if conv.resume_id:
        resume = db.query(Resume).filter(Resume.id == conv.resume_id).first()
    if not resume:
        resume = db.query(Resume).filter(Resume.user_id == current_user.id, Resume.is_active == 1).first()
    if not resume:
        resume = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.uploaded_at.desc()).first()

    resume_text = resume.parsed_text if resume else ""
    structured_resume = json.loads(resume.parsed_json) if (resume and resume.parsed_json) else extract_structured_resume(resume_text)

    # Load conversation history for memory
    past_msgs = db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation_id,
        ChatMessage.id != user_msg.id
    ).order_by(ChatMessage.created_at.asc()).all()

    history = [{"sender": m.sender, "message": m.message} for m in past_msgs]

    try:
        reply_text, sources = chat_career_assistant(
            resume_text=resume_text,
            structured_resume=structured_resume,
            history=history,
            user_message=user_text
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to communicate with AI Assistant: {str(e)}")

    # Update conversation title if first user message
    if len(past_msgs) <= 1:
        words = user_text.split()[:5]
        conv.title = " ".join(words).capitalize()

    # Save assistant message
    asst_msg = ChatMessage(
        conversation_id=conversation_id,
        sender="assistant",
        message=reply_text,
        sources_json=json.dumps(sources)
    )
    db.add(asst_msg)
    db.commit()
    db.refresh(asst_msg)

    return {
        "id": asst_msg.id,
        "conversation_id": asst_msg.conversation_id,
        "sender": asst_msg.sender,
        "message": asst_msg.message,
        "sources": sources,
        "created_at": asst_msg.created_at
    }

@app.delete(f"{settings.API_V1_STR}/conversations/{{conversation_id}}")
def delete_conversation(conversation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Deletes a conversation history session."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or conv.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    db.delete(conv)
    db.commit()
    return {"message": "Conversation deleted successfully."}


# ==========================================
# --- AI Resume Improvement Endpoint ---
# ==========================================

@app.post(f"{settings.API_V1_STR}/resumes/improve", response_model=ResumeImproveResponse)
def improve_resume_section(
    req: ResumeImproveRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Uses Gemini AI to enhance resume summaries, project descriptions, or experience bullets
    using strong action verbs and STAR methodology without fabricating credentials.
    """
    if not req.content or len(req.content.strip()) < 10:
        raise HTTPException(status_code=400, detail="Please provide at least 10 characters to improve.")
    
    try:
        result = generate_resume_improvement(
            section_type=req.section_type,
            original_content=req.content,
            target_role=req.target_role or ""
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# --- AI Interview Preparation Endpoints ---
# ==========================================

@app.post(f"{settings.API_V1_STR}/interview-prep/generate", response_model=InterviewPrepResponse)
def generate_interview_questions(
    req: InterviewPrepRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates personalized interview prep questions (technical, project deep-dive, behavioral)
    tailored to the candidate's verified resume and target role.
    """
    # Resolve resume
    resume = None
    if req.resume_id:
        resume = db.query(Resume).filter(Resume.id == req.resume_id).first()
    if not resume:
        resume = db.query(Resume).filter(Resume.user_id == current_user.id, Resume.is_active == 1).first()
    if not resume:
        resume = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.uploaded_at.desc()).first()

    resume_text = resume.parsed_text if resume else ""

    questions = generate_personalized_interview_prep(
        resume_text=resume_text,
        target_role=req.target_role,
        job_description=req.job_description or ""
    )

    new_prep = InterviewPrep(
        user_id=current_user.id,
        resume_id=resume.id if resume else None,
        target_role=req.target_role,
        job_description=req.job_description,
        questions_json=json.dumps(questions)
    )
    db.add(new_prep)
    db.commit()
    db.refresh(new_prep)

    return {
        "id": new_prep.id,
        "resume_id": new_prep.resume_id,
        "target_role": new_prep.target_role,
        "job_description": new_prep.job_description,
        "questions": questions,
        "created_at": new_prep.created_at
    }

@app.get(f"{settings.API_V1_STR}/interview-prep", response_model=List[InterviewPrepResponse])
def get_user_interview_preps(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns saved interview prep sessions for user."""
    preps = db.query(InterviewPrep).filter(InterviewPrep.user_id == current_user.id).order_by(InterviewPrep.created_at.desc()).all()
    results = []
    for p in preps:
        results.append({
            "id": p.id,
            "resume_id": p.resume_id,
            "target_role": p.target_role,
            "job_description": p.job_description,
            "questions": json.loads(p.questions_json) if p.questions_json else [],
            "created_at": p.created_at
        })
    return results


# ==========================================
# --- Candidate Dashboard Endpoint ---
# ==========================================

@app.get(f"{settings.API_V1_STR}/dashboard/candidate", response_model=CandidateDashboardResponse)
def get_candidate_dashboard_overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Aggregates personalized candidate dashboard metrics from live database data."""
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).all()
    total_resumes = len(resumes)

    active_resume = db.query(Resume).filter(Resume.user_id == current_user.id, Resume.is_active == 1).first()
    if not active_resume and resumes:
        active_resume = resumes[0]

    latest_analysis = None
    if active_resume:
        analysis = db.query(ResumeAnalysis).filter(ResumeAnalysis.resume_id == active_resume.id).order_by(ResumeAnalysis.created_at.desc()).first()
        if analysis:
            latest_analysis = {
                "overall_score": analysis.overall_score,
                "ats_score": analysis.ats_score,
                "structure_score": analysis.structure_score,
                "content_score": analysis.content_score,
                "skills_score": analysis.skills_score,
                "strengths": json.loads(analysis.strengths_json) if analysis.strengths_json else [],
                "weaknesses": json.loads(analysis.weaknesses_json) if analysis.weaknesses_json else [],
                "created_at": str(analysis.created_at)
            }

    # Matches
    matches = db.query(JobMatch).filter(JobMatch.user_id == current_user.id).order_by(JobMatch.created_at.desc()).all()
    recent_matches = []
    for m in matches[:5]:
        recent_matches.append({
            "id": m.id,
            "job_title": m.job_title,
            "job_company": m.job_company,
            "overall_match_score": m.overall_match_score,
            "created_at": str(m.created_at)
        })

    # Conversations
    convs = db.query(Conversation).filter(Conversation.user_id == current_user.id).order_by(Conversation.updated_at.desc()).all()
    recent_convs = []
    for c in convs[:5]:
        recent_convs.append({
            "id": c.id,
            "title": c.title,
            "updated_at": str(c.updated_at)
        })

    # Skills from active resume
    top_skills = []
    if active_resume and active_resume.parsed_json:
        try:
            pj = json.loads(active_resume.parsed_json)
            top_skills = pj.get("skills", {}).get("all_skills", [])[:10]
        except Exception:
            pass

    return {
        "total_resumes": total_resumes,
        "active_resume": {
            "id": active_resume.id,
            "file_name": active_resume.file_name,
            "uploaded_at": str(active_resume.uploaded_at)
        } if active_resume else None,
        "latest_analysis": latest_analysis,
        "total_matches": len(matches),
        "total_conversations": len(convs),
        "top_skills": top_skills,
        "recent_matches": recent_matches,
        "recent_conversations": recent_convs
    }


# ==========================================
# --- Recruiter & Jobs Management Endpoints ---
# ==========================================

@app.post(f"{settings.API_V1_STR}/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(allowed_roles=["admin", "recruiter"]))
):
    """Creates a new Job Description."""
    new_job = Job(
        title=job_in.title,
        company=job_in.company,
        description=job_in.description,
        required_skills=job_in.required_skills,
        preferred_skills=job_in.preferred_skills,
        experience_required=job_in.experience_required,
        created_by=current_user.id
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job

@app.get(f"{settings.API_V1_STR}/jobs", response_model=List[JobResponse])
def list_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all available jobs for candidates to browse and recruiters to manage."""
    return db.query(Job).order_by(Job.created_at.desc()).all()

@app.get(f"{settings.API_V1_STR}/jobs/{{job_id}}", response_model=JobResponse)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Gets details for a single job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job

@app.delete(f"{settings.API_V1_STR}/jobs/{{job_id}}")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(allowed_roles=["admin", "recruiter"]))
):
    """Deletes a job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    db.delete(job)
    db.commit()
    return {"message": "Job deleted successfully."}


# ==========================================
# --- Candidate Upload & Ranking (Recruiter Flow) ---
# ==========================================

@app.post(f"{settings.API_V1_STR}/jobs/{{job_id}}/upload", status_code=status.HTTP_201_CREATED)
async def upload_resumes(
    job_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(allowed_roles=["admin", "recruiter"]))
):
    """
    Accepts multiple PDF/DOCX resumes, saves them, parses text, extracts information,
    computes scores, rates with Gemini, and recalculates candidate rankings.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
        
    job_dict = {
        "title": job.title,
        "company": job.company,
        "description": job.description,
        "required_skills": job.required_skills,
        "preferred_skills": job.preferred_skills,
        "experience_required": job.experience_required
    }
    
    results = []
    
    for file in files:
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in [".pdf", ".docx", ".doc", ".txt"]:
            continue
            
        temp_filename = f"job_{job_id}_{random.randint(1, 1000000)}{file_ext}"
        save_path = os.path.join(settings.UPLOAD_DIR, temp_filename)
        
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        try:
            parsed_text = parse_resume(save_path)
            if not parsed_text.strip():
                continue
                
            name = extract_name(parsed_text)
            email = extract_email(parsed_text) or f"no_email_{random.randint(1, 100000)}@talentai.mock"
            phone = extract_phone(parsed_text)
            experience = extract_experience_years(parsed_text)
            education = extract_education(parsed_text)
            skills = extract_skills(parsed_text)
            
            candidate = db.query(Candidate).filter(Candidate.email == email).first()
            if not candidate:
                candidate = Candidate(
                    name=name,
                    email=email,
                    phone=phone,
                    experience=experience,
                    education=education
                )
                db.add(candidate)
                db.flush()
            else:
                candidate.name = name
                candidate.phone = phone or candidate.phone
                candidate.experience = max(experience, candidate.experience)
                candidate.education = education or candidate.education
                
            for skill_name in skills:
                skill = db.query(Skill).filter(Skill.skill_name == skill_name).first()
                if not skill:
                    skill = Skill(skill_name=skill_name)
                    db.add(skill)
                    db.flush()
                if skill not in candidate.skills:
                    candidate.skills.append(skill)
                    
            resume = db.query(Resume).filter(Resume.candidate_id == candidate.id).first()
            if not resume:
                resume = Resume(
                    candidate_id=candidate.id,
                    resume_path=save_path,
                    file_name=file.filename,
                    file_type=file_ext,
                    parsed_text=parsed_text,
                    parsed_json=json.dumps(extract_structured_resume(parsed_text))
                )
                db.add(resume)
            else:
                resume.resume_path = save_path
                resume.parsed_text = parsed_text
                resume.parsed_json = json.dumps(extract_structured_resume(parsed_text))
                
            db.flush()
            
            ats_score, ats_breakdown = calculate_ats_score(
                candidate_skills=skills,
                candidate_exp=experience,
                candidate_edu=education,
                resume_text=parsed_text,
                job=job_dict
            )
            
            similarity_score = compute_semantic_similarity(
                job_description=job.description,
                resume_text=parsed_text
            )
            
            final_score = round((ats_score * 0.6) + (similarity_score * 0.4), 1)
            
            ai_eval = evaluate_candidate_with_gemini(
                resume_text=parsed_text,
                job_title=job.title,
                job_description=job.description
            )
            
            score_entry = db.query(CandidateScore).filter(
                CandidateScore.candidate_id == candidate.id,
                CandidateScore.job_id == job.id
            ).first()
            
            hiring_rec = ai_eval.get("hiring_recommendation", "Consider")
            
            if not score_entry:
                score_entry = CandidateScore(
                    candidate_id=candidate.id,
                    job_id=job.id,
                    ats_score=ats_score,
                    similarity_score=similarity_score,
                    final_score=final_score,
                    hiring_recommendation=hiring_rec,
                    evaluation_json=json.dumps(ai_eval)
                )
                db.add(score_entry)
            else:
                score_entry.ats_score = ats_score
                score_entry.similarity_score = similarity_score
                score_entry.final_score = final_score
                score_entry.hiring_recommendation = hiring_rec
                score_entry.evaluation_json = json.dumps(ai_eval)
                
            db.commit()
            results.append({"filename": file.filename, "status": "Success", "candidate_name": name})
            
        except Exception as e:
            db.rollback()
            print(f"Error processing file {file.filename}: {e}")
            results.append({"filename": file.filename, "status": "Error", "detail": str(e)})
            
    all_scores = db.query(CandidateScore).filter(CandidateScore.job_id == job_id).order_by(CandidateScore.final_score.desc()).all()
    for rank_idx, score in enumerate(all_scores):
        score.rank = rank_idx + 1
    db.commit()
    
    return {"message": "Files processed", "results": results}

@app.get(f"{settings.API_V1_STR}/jobs/{{job_id}}/candidates", response_model=List[CandidateRankedResponse])
def get_ranked_candidates(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns ranked list of candidates for a specific job."""
    scores = db.query(CandidateScore).filter(CandidateScore.job_id == job_id).order_by(CandidateScore.rank.asc()).all()
    
    ranked_list = []
    for s in scores:
        ranked_list.append({
            "rank": s.rank or 0,
            "candidate_id": s.candidate.id,
            "candidate_name": s.candidate.name,
            "candidate_email": s.candidate.email,
            "candidate_experience": s.candidate.experience,
            "candidate_education": s.candidate.education,
            "ats_score": s.ats_score,
            "similarity_score": s.similarity_score,
            "final_score": s.final_score
        })
    return ranked_list

@app.get(f"{settings.API_V1_STR}/candidates/{{candidate_id}}/evaluation/{{job_id}}", response_model=CandidateEvaluationDetail)
def get_candidate_evaluation_details(
    candidate_id: int,
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns candidate Gemini AI analysis, gap analysis, questions, and scoring breakdown."""
    score = db.query(CandidateScore).filter(
        CandidateScore.candidate_id == candidate_id,
        CandidateScore.job_id == job_id
    ).first()
    
    if not score:
        raise HTTPException(status_code=404, detail="Score entry not found for this candidate and job.")
        
    job = score.job
    candidate = score.candidate
    
    job_dict = {
        "required_skills": job.required_skills,
        "preferred_skills": job.preferred_skills,
        "experience_required": job.experience_required,
        "description": job.description
    }
    
    skills = [sk.skill_name for sk in candidate.skills]
    parsed_text = candidate.resume.parsed_text if candidate.resume else ""
    
    _, ats_breakdown = calculate_ats_score(
        candidate_skills=skills,
        candidate_exp=candidate.experience,
        candidate_edu=candidate.education or "",
        resume_text=parsed_text,
        job=job_dict
    )
    
    eval_dict = {}
    if score.evaluation_json:
        try:
            eval_dict = json.loads(score.evaluation_json)
        except Exception:
            pass
            
    if not eval_dict:
        eval_dict = evaluate_candidate_with_gemini(
            resume_text=parsed_text,
            job_title=job.title,
            job_description=job.description
        )
        score.evaluation_json = json.dumps(eval_dict)
        db.commit()
        
    return {
        "candidate_id": candidate_id,
        "job_id": job_id,
        "ats_score": score.ats_score,
        "similarity_score": score.similarity_score,
        "final_score": score.final_score,
        "rank": score.rank or 1,
        "ats_breakdown": ats_breakdown,
        "ai_summary": eval_dict.get("candidate_summary", ""),
        "strengths": eval_dict.get("strengths", []),
        "weaknesses": eval_dict.get("weaknesses", []),
        "missing_skills": eval_dict.get("missing_skills", []),
        "hiring_recommendation": eval_dict.get("hiring_recommendation", "Consider"),
        "learning_path": eval_dict.get("learning_path", []),
        "interview_questions": eval_dict.get("interview_questions", [])
    }

@app.post(f"{settings.API_V1_STR}/candidates/{{candidate_id}}/chat", response_model=ChatResponse)
def chat_with_candidate_resume(
    candidate_id: int,
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Recruiter queries candidate's resume using RAG."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate or not candidate.resume:
        raise HTTPException(status_code=404, detail="Candidate or resume text not found.")
        
    answer = ask_resume_chatbot(
        candidate_id=candidate_id,
        resume_text=candidate.resume.parsed_text or "",
        question=req.question
    )
    return {"answer": answer}

@app.get(f"{settings.API_V1_STR}/analytics", response_model=DashboardAnalyticsResponse)
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aggregates platform statistics for the recruiter dashboard."""
    total_jobs = db.query(Job).count()
    total_candidates = db.query(Candidate).count()
    
    avg_ats = db.query(func.avg(CandidateScore.ats_score)).scalar() or 0.0
    avg_ats = round(float(avg_ats), 1)
    
    top_skills_query = (
        db.query(Skill.skill_name, func.count(candidate_skills.c.candidate_id).label("count"))
        .join(candidate_skills, Skill.id == candidate_skills.c.skill_id)
        .group_by(Skill.skill_name)
        .order_by(func.count(candidate_skills.c.candidate_id).desc())
        .limit(10)
        .all()
    )
    top_skills = [SkillDistributionItem(skill_name=name, count=cnt) for name, cnt in top_skills_query]
    
    funnel_stages = ["Strong Hire", "Hire", "Consider", "Reject"]
    funnel_data = []
    for stage in funnel_stages:
        cnt = db.query(CandidateScore).filter(CandidateScore.hiring_recommendation == stage).count()
        funnel_data.append(StatusFunnelItem(stage=stage, count=cnt))
        
    ranges = [("0-40", 0, 40), ("41-60", 41, 60), ("61-80", 61, 80), ("81-100", 81, 100)]
    ats_dist = []
    for label, low, high in ranges:
        cnt = db.query(CandidateScore).filter(CandidateScore.ats_score >= low, CandidateScore.ats_score <= high).count()
        ats_dist.append(ScoreDistributionItem(range=label, count=cnt))
        
    return {
        "total_jobs": total_jobs,
        "total_candidates": total_candidates,
        "average_ats_score": avg_ats,
        "top_skills": top_skills,
        "candidate_distribution": funnel_data,
        "ats_distribution": ats_dist
    }
