import os
import shutil
import json
import random
from typing import List
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.config import settings
from backend.database import engine, get_db, Base
from backend.models import User, Job, Candidate, Resume, Skill, CandidateScore, candidate_skills
from backend.schemas import (
    UserCreate, UserResponse, Token, UserLogin,
    JobCreate, JobResponse,
    CandidateRankedResponse, CandidateEvaluationDetail,
    ChatRequest, ChatResponse, DashboardAnalyticsResponse,
    SkillDistributionItem, ScoreDistributionItem, StatusFunnelItem
)
from backend.auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, RoleChecker
)
from backend.parser import parse_resume
from backend.nlp import (
    extract_name, extract_email, extract_phone, extract_skills,
    extract_experience_years, extract_education, calculate_ats_score,
    compute_semantic_similarity, evaluate_candidate_with_gemini, ask_resume_chatbot
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
    allow_origins=["*"], # In production, configure to the specific frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Authentication Endpoints ---

@app.post(f"{settings.API_V1_STR}/auth/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    """Registers a new user (Recruiter or Admin)."""
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hashed_password,
        role=user_in.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post(f"{settings.API_V1_STR}/auth/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    """Authenticates user and returns JWT token."""
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name
    }

@app.get(f"{settings.API_V1_STR}/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns profile of the authenticated user."""
    return current_user


# --- Jobs Management Endpoints ---

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
    """Lists all created jobs."""
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


# --- Candidate Upload & Ranking Endpoints ---

@app.post(f"{settings.API_V1_STR}/jobs/{{job_id}}/upload", status_code=status.HTTP_201_CREATED)
async def upload_resumes(
    job_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(allowed_roles=["admin", "recruiter"]))
):
    """
    Accepts multiple PDF/DOCX resumes, saves them, parses text, extracts information,
    computes scores, rates with Gemini, and rankings are recalculated.
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
        # Save file to uploads folder
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in [".pdf", ".docx", ".doc"]:
            continue # Skip unsupported files
            
        temp_filename = f"job_{job_id}_{random.randint(1, 1000000)}{file_ext}"
        save_path = os.path.join(settings.UPLOAD_DIR, temp_filename)
        
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        try:
            # 1. Parse text
            parsed_text = parse_resume(save_path)
            if not parsed_text.strip():
                print(f"Skipping empty or unparseable resume: {file.filename}")
                continue
                
            # 2. Extract Candidate Info
            name = extract_name(parsed_text)
            email = extract_email(parsed_text) or f"no_email_{random.randint(1, 100000)}@talentai.mock"
            phone = extract_phone(parsed_text)
            experience = extract_experience_years(parsed_text)
            education = extract_education(parsed_text)
            skills = extract_skills(parsed_text)
            
            # 3. Save Candidate in Database
            # Check if candidate exists by email
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
                db.flush() # Populate ID
            else:
                # Update candidate information with newest resume data
                candidate.name = name
                candidate.phone = phone or candidate.phone
                candidate.experience = max(experience, candidate.experience)
                candidate.education = education or candidate.education
                
            # Associate skills
            for skill_name in skills:
                skill = db.query(Skill).filter(Skill.skill_name == skill_name).first()
                if not skill:
                    skill = Skill(skill_name=skill_name)
                    db.add(skill)
                    db.flush()
                if skill not in candidate.skills:
                    candidate.skills.append(skill)
                    
            # 4. Save Resume
            resume = db.query(Resume).filter(Resume.candidate_id == candidate.id).first()
            if not resume:
                resume = Resume(
                    candidate_id=candidate.id,
                    resume_path=save_path,
                    parsed_text=parsed_text
                )
                db.add(resume)
            else:
                # Overwrite resume path and content
                if os.path.exists(resume.resume_path) and resume.resume_path != save_path:
                    try:
                        os.remove(resume.resume_path)
                    except:
                        pass
                resume.resume_path = save_path
                resume.parsed_text = parsed_text
                
            db.flush()
            
            # 5. Compute Scoring
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
            
            final_score = (ats_score * 0.6) + (similarity_score * 0.4)
            final_score = round(final_score, 1)
            
            # 6. Run Gemini AI Evaluator (returns summaries & interview questions)
            ai_eval = evaluate_candidate_with_gemini(
                resume_text=parsed_text,
                job_title=job.title,
                job_description=job.description
            )
            
            # 7. Create/Update Score entry
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
            
    # 8. Re-rank all candidates for this Job
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
    """Returns cached Gemini AI analysis, gap analysis, questions, and scoring breakdown."""
    score = db.query(CandidateScore).filter(
        CandidateScore.candidate_id == candidate_id,
        CandidateScore.job_id == job_id
    ).first()
    
    if not score:
        raise HTTPException(status_code=404, detail="Score entry not found for this candidate and job.")
        
    job = score.job
    candidate = score.candidate
    
    # Recalculate breakdown dynamically
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
    
    # Load cached Gemini evaluation JSON
    eval_dict = {}
    if score.evaluation_json:
        try:
            eval_dict = json.loads(score.evaluation_json)
        except Exception:
            pass
            
    if not eval_dict:
        # Generate on-the-fly if not cached
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


# --- RAG Chatbot Endpoint ---

@app.post(f"{settings.API_V1_STR}/candidates/{{candidate_id}}/chat", response_model=ChatResponse)
def chat_with_candidate_resume(
    candidate_id: int,
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Queries candidate's resume vector DB index using LangChain + FAISS + Gemini."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate or not candidate.resume:
        raise HTTPException(status_code=404, detail="Candidate or resume text not found.")
        
    answer = ask_resume_chatbot(
        candidate_id=candidate_id,
        resume_text=candidate.resume.parsed_text or "",
        question=req.question
    )
    
    return {"answer": answer}


# --- Dashboard / Analytics Endpoint ---

@app.get(f"{settings.API_V1_STR}/analytics", response_model=DashboardAnalyticsResponse)
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aggregates platform statistics for the recruiter dashboard."""
    total_jobs = db.query(Job).count()
    total_candidates = db.query(Candidate).count()
    
    # Average ATS score
    avg_ats = db.query(func.avg(CandidateScore.ats_score)).scalar() or 0.0
    avg_ats = round(float(avg_ats), 1)
    
    # Skill Distribution: count top skills in the database
    # SELECT s.skill_name, count(cs.candidate_id) FROM skills s JOIN candidate_skills cs ...
    top_skills_query = (
        db.query(Skill.skill_name, func.count(candidate_skills.c.candidate_id).label("count"))
        .join(candidate_skills, Skill.id == candidate_skills.c.skill_id)
        .group_by(Skill.skill_name)
        .order_by(func.count(candidate_skills.c.candidate_id).desc())
        .limit(10)
        .all()
    )
    top_skills = [SkillDistributionItem(skill_name=name, count=cnt) for name, cnt in top_skills_query]
    
    # Hiring recommendation (funnel) distribution
    funnel_stages = ["Strong Hire", "Hire", "Consider", "Reject"]
    funnel_data = []
    for stage in funnel_stages:
        cnt = db.query(CandidateScore).filter(CandidateScore.hiring_recommendation == stage).count()
        funnel_data.append(StatusFunnelItem(stage=stage, count=cnt))
        
    # ATS distribution
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
