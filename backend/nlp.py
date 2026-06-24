import os
import re
import json
import datetime
import numpy as np
from typing import List, Dict, Tuple, Optional

# NLTK and spaCy imports with automatic fallback / download
import nltk
from nltk.tokenize import word_tokenize
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

import spacy
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("spaCy model 'en_core_web_sm' not found. Installing...")
    try:
        os.system("python -m spacy download en_core_web_sm")
        nlp = spacy.load("en_core_web_sm")
    except Exception as e:
        print(f"Failed to load or install spaCy model: {e}. Using regex/fallback NLP.")
        nlp = None

from sentence_transformers import SentenceTransformer, util
import google.generativeai as genai

# LangChain and FAISS imports
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings

from backend.config import settings

# Global lazy load for SentenceTransformer
_embedding_model = None
def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
    return _embedding_model

# Comprehensive dictionary of technical skills to match against
SKILL_DICTIONARY = {
    "Programming Languages": ["python", "java", "sql", "javascript", "typescript", "c", "c++", "go", "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "html", "css", "bash", "shell"],
    "Frameworks": ["fastapi", "flask", "django", "react", "angular", "vue", "nextjs", "svelte", "spring boot", "express", "nestjs", "rails", "laravel", "bootstrap", "tailwind"],
    "Databases": ["postgresql", "postgres", "mysql", "mongodb", "sqlite", "redis", "cassandra", "dynamodb", "oracle", "sql server", "neo4j", "mariadb"],
    "Cloud & DevOps": ["aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "terraform", "ansible", "jenkins", "gitlab ci", "github actions", "circleci", "prometheus", "grafana"],
    "AI/ML & Data Science": ["tensorflow", "pytorch", "keras", "scikit-learn", "sklearn", "pandas", "numpy", "spark", "nltk", "spacy", "langchain", "huggingface", "opencv", "faiss", "llm", "bert", "gpt", "matplotlib", "seaborn", "scipy"],
    "Data & Analytics": ["power bi", "tableau", "excel", "looker", "dbt", "snowflake", "redshift", "bigquery"]
}

# Flatten skill dictionary for quick lookup
ALL_SKILLS = [skill for category in SKILL_DICTIONARY.values() for skill in category]

def clean_text(text: str) -> str:
    """Cleans text of extra whitespaces and special characters."""
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_email(text: str) -> Optional[str]:
    email_regex = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    match = re.search(email_regex, text)
    return match.group(0) if match else None

def extract_phone(text: str) -> Optional[str]:
    # Support various formats like +1-123-456-7890, (123) 456 7890, 1234567890 etc.
    phone_regex = r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    match = re.search(phone_regex, text)
    return match.group(0) if match else None

def extract_name(text: str) -> str:
    """
    Tries to extract the candidate's name. Usually, names are at the very top of the resume.
    Uses basic heuristics combined with spaCy if available.
    """
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if not lines:
        return "Unknown Candidate"
    
    # Check first line. If it contains common resume headers, check next.
    for line in lines[:3]:
        # Exclude contact info or common words
        if "@" in line or "resume" in line.lower() or "curriculum" in line.lower() or len(line.split()) > 4:
            continue
        if nlp:
            doc = nlp(line)
            for ent in doc.ents:
                if ent.label_ == "PERSON":
                    return ent.text
        # Fallback to the first capitalized line of 2-3 words
        words = line.split()
        if 1 <= len(words) <= 3 and all(w[0].isupper() for w in words if w.isalpha()):
            return line
            
    return lines[0] if len(lines[0]) < 50 else "Unknown Candidate"

def extract_skills(text: str) -> List[str]:
    """
    Extracts technical skills based on the ALL_SKILLS dictionary.
    Uses regex boundary matching to avoid false positives (e.g., 'go' in 'good').
    """
    found_skills = set()
    text_lower = text.lower()
    
    for skill in ALL_SKILLS:
        # Match word boundaries. Special handling for skills with symbols (c++, c#, .net)
        pattern = r'\b' + re.escape(skill) + r'\b'
        if skill in ["c++", "c#", ".net"]:
            pattern = re.escape(skill)
            
        if re.search(pattern, text_lower):
            # Normalize display name
            normalized = skill
            # Capitalize standard names
            for cat, skill_list in SKILL_DICTIONARY.items():
                for orig in skill_list:
                    if orig == skill:
                        # Return match with correct casing if applicable
                        if skill in ["aws", "gcp", "sql", "llm", "gpt", "bert", "dbt"]:
                            normalized = skill.upper()
                        elif skill in ["react", "django", "flask", "fastapi", "docker", "kubernetes", "terraform", "ansible", "jenkins", "git", "python", "java", "pandas", "numpy", "spacy", "nltk", "langchain", "faiss"]:
                            normalized = skill.capitalize()
                        elif skill == "pytorch":
                            normalized = "PyTorch"
                        elif skill == "tensorflow":
                            normalized = "TensorFlow"
                        elif skill == "scikit-learn":
                            normalized = "Scikit-Learn"
                        elif skill == "power bi":
                            normalized = "Power BI"
                        elif skill == "mongodb":
                            normalized = "MongoDB"
                        elif skill == "postgresql":
                            normalized = "PostgreSQL"
                        elif skill == "typescript":
                            normalized = "TypeScript"
                        elif skill == "javascript":
                            normalized = "JavaScript"
            found_skills.add(normalized)
            
    return sorted(list(found_skills))

def extract_experience_years(text: str) -> int:
    """
    Extracts approximate years of experience using regex indicators.
    """
    exp_patterns = [
        r'(\d+)\+?\s*(?:year|yr)s?\s*(?:of)?\s*experience',
        r'experience\s*:\s*(\d+)\+?\s*years',
        r'(\d+)\s*(?:year|yr)s?\s*of\s*(?:professional|work)\s*experience'
    ]
    
    years = []
    for pattern in exp_patterns:
        matches = re.findall(pattern, text.lower())
        for match in matches:
            try:
                years.append(int(match))
            except ValueError:
                pass
                
    if years:
        return max(years)
        
    # Fallback: Count employment year blocks (e.g. 2018 - 2021)
    year_blocks = re.findall(r'\b(19\d{2}|20\d{2})\s*[-–—]\s*(19\d{2}|20\d{2}|present|current)\b', text.lower())
    calculated_exp = 0
    current_year = datetime.datetime.now().year if hasattr(datetime, "datetime") else 2026
    for start, end in year_blocks:
        try:
            start_yr = int(start)
            end_yr = current_year if end in ["present", "current"] else int(end)
            diff = end_yr - start_yr
            if 0 < diff < 20:
                calculated_exp += diff
        except ValueError:
            pass
    if calculated_exp > 0:
        return min(calculated_exp, 30) # cap at 30
        
    return 0

def extract_education(text: str) -> str:
    """
    Extracts education level / degrees detected in the text.
    """
    degrees = []
    text_lower = text.lower()
    
    if re.search(r'\b(ph\.?d|doctorate)\b', text_lower):
        degrees.append("PhD")
    if re.search(r'\b(master|m\.?s|m\.?tech|mba|m\.?sc)\b', text_lower):
        degrees.append("Master's")
    if re.search(r'\b(bachelor|b\.?s|b\.?tech|b\.?a|b\.?sc|b\.?e)\b', text_lower):
        degrees.append("Bachelor's")
    if re.search(r'\b(diploma|associate degree)\b', text_lower):
        degrees.append("Associate/Diploma")
        
    if degrees:
        return " / ".join(degrees)
    
    # Look for context line containing "university", "college", "school", "education"
    lines = text.split("\n")
    for line in lines:
        if any(keyword in line.lower() for keyword in ["university", "college", "institute of", "bs in", "ms in"]):
            if len(line.strip()) < 100:
                return line.strip()
                
    return "Not explicitly specified"

def parse_projects_count(text: str) -> int:
    """Counts projects listed in the resume."""
    text_lower = text.lower()
    # Count occurrences of "project" in titles or bullet lists
    # Or common phrases like "Project:" or "Project Name:"
    project_headers = len(re.findall(r'\bproject\b', text_lower))
    # Let's clean the heuristic: count occurrences of "github" or "portfolio" or bullet items under a projects section
    has_projects_section = re.search(r'\b(projects|academic projects|key projects|personal projects)\b', text_lower)
    
    if has_projects_section:
        # Give a baseline of projects if the section exists
        return max(2, min(5, project_headers))
    return min(3, project_headers)

# ATS Score Calculator
def calculate_ats_score(candidate_skills: List[str], candidate_exp: int, candidate_edu: str, resume_text: str, job: Dict) -> Tuple[float, dict]:
    """
    Calculates ATS Score based on weightage:
    - Skill Match = 50%
    - Experience Match = 20%
    - Education Match = 10%
    - Projects Match = 20%
    """
    # 1. Skill Match (50 points)
    # Parse required and preferred skills
    req_skills_list = [s.strip().lower() for s in job.get("required_skills", "").split(",") if s.strip()]
    pref_skills_list = [s.strip().lower() for s in job.get("preferred_skills", "").split(",") if s.strip()]
    
    cand_skills_lower = [s.lower() for s in candidate_skills]
    
    skill_score = 0.0
    if req_skills_list:
        matched_req = [s for s in req_skills_list if s in cand_skills_lower]
        req_ratio = len(matched_req) / len(req_skills_list)
        
        # 40 points for required skills, 10 for preferred
        req_points = req_ratio * 40.0
        
        if pref_skills_list:
            matched_pref = [s for s in pref_skills_list if s in cand_skills_lower]
            pref_ratio = len(matched_pref) / len(pref_skills_list)
            pref_points = pref_ratio * 10.0
        else:
            # If no preferred skills, required skills count for the full 50 points
            req_points = req_ratio * 50.0
            pref_points = 0.0
            
        skill_score = req_points + pref_points
    else:
        # If job has no skills specified
        skill_score = 50.0
        
    # 2. Experience Match (20 points)
    req_exp = job.get("experience_required", 0)
    if req_exp == 0:
        exp_score = 20.0
    else:
        # Max of 20 points, proportional matching
        ratio = candidate_exp / req_exp
        exp_score = min(20.0, ratio * 20.0)

    # 3. Education Match (10 points)
    # Map candidate education level
    cand_edu_lower = candidate_edu.lower()
    edu_level = 0
    if "ph" in cand_edu_lower or "doctor" in cand_edu_lower:
        edu_level = 5
    elif "master" in cand_edu_lower or "ms" in cand_edu_lower or "m.tech" in cand_edu_lower or "mba" in cand_edu_lower:
        edu_level = 4
    elif "bachelor" in cand_edu_lower or "bs" in cand_edu_lower or "b.tech" in cand_edu_lower or "degree" in cand_edu_lower:
        edu_level = 3
    elif "diploma" in cand_edu_lower or "associate" in cand_edu_lower:
        edu_level = 2
    elif cand_edu_lower != "not explicitly specified":
        edu_level = 1
        
    # Determine job required education
    jd_desc_lower = job.get("description", "").lower()
    req_level = 3 # Default required Bachelor's
    if "phd" in jd_desc_lower or "doctorate" in jd_desc_lower:
        req_level = 5
    elif "master" in jd_desc_lower or "m.s." in jd_desc_lower or "m.tech" in jd_desc_lower or "ms degree" in jd_desc_lower:
        req_level = 4
        
    if edu_level >= req_level:
        edu_score = 10.0
    else:
        # Deduct slightly if lower education
        edu_score = max(4.0, 10.0 * (edu_level / max(1, req_level)))

    # 4. Projects Match (20 points)
    projects_count = parse_projects_count(resume_text)
    if projects_count >= 3:
        project_score = 20.0
    elif projects_count == 2:
        project_score = 15.0
    elif projects_count == 1:
        project_score = 10.0
    else:
        project_score = 5.0
        
    total_ats = skill_score + exp_score + edu_score + project_score
    
    breakdown = {
        "skills_score": round(skill_score, 1),
        "experience_score": round(exp_score, 1),
        "education_score": round(edu_score, 1),
        "projects_score": round(project_score, 1),
        "total_score": round(total_ats, 1)
    }
    
    return round(total_ats, 1), breakdown

# Semantic Similarity Engine
def compute_semantic_similarity(job_description: str, resume_text: str) -> float:
    """
    Encodes job description and resume using sentence transformers
    and calculates cosine similarity. Returns percentage match (0 - 100).
    """
    try:
        model = get_embedding_model()
        # Clean inputs
        jd_clean = clean_text(job_description)
        resume_clean = clean_text(resume_text)
        
        # Get embeddings
        embeddings = model.encode([jd_clean, resume_clean], convert_to_tensor=True)
        
        # Compute cosine similarity
        cos_sim = util.cos_sim(embeddings[0], embeddings[1])
        score = cos_sim.item()
        
        # Scale to 0-100 and clip
        similarity_percentage = max(0.0, min(1.0, score)) * 100.0
        return round(similarity_percentage, 1)
    except Exception as e:
        print(f"Error computing semantic similarity: {e}")
        return 50.0 # moderate default fallback

# Gemini AI Evaluation Module
def get_mock_gemini_evaluation() -> dict:
    """Failsafe backup mock evaluation data structure."""
    return {
        "candidate_summary": "The candidate has demonstrated relevant technical capabilities and skills. Further evaluation via standard screening is recommended.",
        "strengths": [
            "Matches key programming skills requested.",
            "Demonstrates structured project execution in their profile.",
            "Possesses relevant academic background."
        ],
        "weaknesses": [
            "Details about team sizes or deployment environments are limited.",
            "Missing specific secondary tools in the project logs."
        ],
        "missing_skills": ["Docker", "Kubernetes", "AWS Cloud Services"],
        "hiring_recommendation": "Consider",
        "learning_path": [
            "Take the AWS Certified Cloud Practitioner course to build basic cloud skills.",
            "Complete a hands-on Docker and Kubernetes deployment tutorial on Coursera.",
            "Build a personal project incorporating CI/CD pipelines to demonstrate DevOps capabilities."
        ],
        "interview_questions": [
            {
                "question": "Can you explain a complex project you developed and how you resolved its technical hurdles?",
                "category": "Behavioural",
                "suggested_answer": "Look for a candidate who describes a real project, identifies a clear technical roadblock, explains their analytical path, and shows a successful outcome."
            },
            {
                "question": "How do you manage database queries in Python and ensure database connections are efficiently recycled?",
                "category": "Python",
                "suggested_answer": "Candidate should discuss SQLAlchemy SessionLocal configurations, context managers, and setting pool_size or max_overflow configurations."
            },
            {
                "question": "What is the difference between inner join, outer join, and left join in SQL, and when would you use them?",
                "category": "SQL",
                "suggested_answer": "Candidate should define each join clearly and explain how inner join returns matching records, left join returns all from left + matching from right, and when they are applied."
            },
            {
                "question": "Can you describe standard overfitting prevention techniques in Machine Learning model training?",
                "category": "Machine Learning",
                "suggested_answer": "Expect mention of cross-validation, regularization (L1/L2), dropout layers in neural networks, and early stopping."
            }
        ]
    }

def evaluate_candidate_with_gemini(resume_text: str, job_title: str, job_description: str) -> dict:
    """
    Integrates Gemini API to generate comprehensive candidate summary, strengths, 
    weaknesses, missing skills, recommendations, learning paths, and personalized questions.
    """
    if not settings.GEMINI_API_KEY:
        print("GEMINI_API_KEY is not configured. Returning mock evaluation.")
        return get_mock_gemini_evaluation()
        
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        prompt = f"""
        You are an expert HR manager and technical recruiter.
        Analyze the following resume text against the Job Description (Title: {job_title}).
        
        Job Description:
        {job_description}
        
        Resume Text:
        {resume_text}
        
        Provide your evaluation in strict JSON format with the following keys. Do not include markdown code block formatting like ```json. Just return the raw JSON object. Ensure all keys exist.
        
        JSON Keys:
        1. "candidate_summary": A 2-3 sentence overview of the candidate's experience and fit.
        2. "strengths": A list of 3-4 key strengths of this candidate.
        3. "weaknesses": A list of 2-3 areas of improvement or weaknesses.
        4. "missing_skills": A list of skills requested in the Job Description that are missing from the candidate's resume.
        5. "hiring_recommendation": One of the following: "Strong Hire", "Hire", "Consider", "Reject".
        6. "learning_path": A list of 3 learning path recommendations to bridge any skill gaps.
        7. "interview_questions": A list of 4 personalized interview questions based on their profile. Each question must be an object with:
           - "question": string
           - "category": string (e.g. "Python", "SQL", "Machine Learning", "Behavioural")
           - "suggested_answer": string (a brief guide on what a good answer should contain)
        """
        
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Strip code block wrappers if generated
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
            
        if text.endswith("```"):
            text = text[:-3]
            
        text = text.strip()
        
        evaluation = json.loads(text)
        return evaluation
        
    except Exception as e:
        print(f"Gemini API call failed with exception: {e}. Returning mock evaluation.")
        return get_mock_gemini_evaluation()

# RAG Resume Chatbot System
def ask_resume_chatbot(candidate_id: int, resume_text: str, question: str) -> str:
    """
    RAG system using LangChain, FAISS index with local Sentence Transformers, 
    and Gemini API to query a single candidate's resume.
    """
    try:
        # 1. Text Splitting
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=600,
            chunk_overlap=120
        )
        chunks = text_splitter.split_text(resume_text)
        if not chunks:
            chunks = [resume_text]
            
        # 2. Embedding Index Creation (Using local Hugging Face Embeddings to keep FAISS lightweight)
        embeddings = HuggingFaceEmbeddings(model_name=settings.EMBEDDING_MODEL_NAME)
        vector_store = FAISS.from_texts(chunks, embeddings)
        
        # 3. Retrieve Context
        docs = vector_store.similarity_search(question, k=3)
        context = "\n---\n".join([doc.page_content for doc in docs])
        
        # 4. Synthesize Answer using Gemini
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            prompt = f"""
            You are a helpful HR assistant chatbot for the TalentAI platform.
            You are answering questions about a candidate's resume based ONLY on the provided context retrieved from their resume.
            
            Retrieved Resume Context:
            {context}
            
            Question:
            {question}
            
            Provide a clear, factual, and concise answer based strictly on the context. If the answer cannot be found in the context, state that the resume does not specify this information.
            """
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content(prompt)
            return response.text.strip()
        else:
            # Local fallback response based on matching text if API key is not present
            return f"[Local Fallback Mode - No Gemini API Key] Context retrieved from candidate's resume:\n{context}\n\nPlease configure GEMINI_API_KEY to get generative answers."
            
    except Exception as e:
        print(f"RAG Chatbot failed: {e}")
        return "An error occurred while querying the resume chatbot. Please make sure the files are correctly processed."
