import sys
import os

# Set PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database import SessionLocal
from backend.parser import parse_resume
from backend.nlp import (
    extract_name, extract_email, extract_phone, extract_skills,
    extract_experience_years, extract_education, calculate_ats_score,
    compute_semantic_similarity, evaluate_candidate_with_gemini
)
from backend.models import Job

def run_test():
    file_path = "../uploads/job_1_302088.pdf"
    if not os.path.exists(file_path):
        file_path = "uploads/job_1_302088.pdf"
    print(f"Testing file: {file_path}")
    
    # 1. Parse text
    try:
        parsed_text = parse_resume(file_path)
        print(f"Parsed text length: {len(parsed_text)}")
        print("First 100 chars of text:")
        print(parsed_text[:100])
    except Exception as e:
        print("Failed parsing:")
        import traceback
        traceback.print_exc()
        return

    # 2. Extract metadata
    try:
        name = extract_name(parsed_text)
        email = extract_email(parsed_text)
        phone = extract_phone(parsed_text)
        experience = extract_experience_years(parsed_text)
        education = extract_education(parsed_text)
        skills = extract_skills(parsed_text)
        print(f"Extracted: Name={name}, Email={email}, Phone={phone}, Exp={experience}, Edu={education}")
        print(f"Skills: {skills}")
    except Exception as e:
        print("Failed extraction:")
        import traceback
        traceback.print_exc()
        return

    # 3. DB connection and job fetch
    try:
        db = SessionLocal()
        job = db.query(Job).filter(Job.id == 1).first()
        if not job:
            print("Job 1 not found in DB!")
            return
        print(f"Job found: {job.title}")
    except Exception as e:
        print("Failed DB fetch:")
        import traceback
        traceback.print_exc()
        return

    # 4. ATS & Semantic Scores
    try:
        job_dict = {
            "title": job.title,
            "company": job.company,
            "description": job.description,
            "required_skills": job.required_skills,
            "preferred_skills": job.preferred_skills,
            "experience_required": job.experience_required
        }
        
        ats_score, ats_breakdown = calculate_ats_score(
            candidate_skills=skills,
            candidate_exp=experience,
            candidate_edu=education,
            resume_text=parsed_text,
            job=job_dict
        )
        print(f"ATS Score: {ats_score}, Breakdown: {ats_breakdown}")
        
        similarity_score = compute_semantic_similarity(
            job_description=job.description,
            resume_text=parsed_text
        )
        print(f"Semantic similarity score: {similarity_score}")
    except Exception as e:
        print("Failed scoring:")
        import traceback
        traceback.print_exc()
        return

    # 5. Gemini API Check
    try:
        print("Listing available models for this key:")
        from backend.config import settings
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        for m in genai.list_models():
            print(f" - {m.name}")
            
        print("Running Gemini Evaluation...")
        ai_eval = evaluate_candidate_with_gemini(
            resume_text=parsed_text,
            job_title=job.title,
            job_description=job.description
        )
        print(f"Gemini evaluation received keys: {list(ai_eval.keys())}")
    except Exception as e:
        print("Failed Gemini:")
        import traceback
        traceback.print_exc()
        return

    # 6. Chatbot Check
    try:
        print("Running Chatbot...")
        from backend.nlp import ask_resume_chatbot
        ans = ask_resume_chatbot(candidate_id=4, resume_text=parsed_text, question="how many projects gayatri done?")
        print(f"Chatbot answer: {ans}")
        if "error occurred" in ans.lower():
            print("Chatbot returned error message!")
            # We raise to print stack trace inside our try-except
            raise Exception(ans)
    except Exception as e:
        print("Failed Chatbot:")
        import traceback
        traceback.print_exc()
        return

    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_test()
