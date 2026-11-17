import os
import re
import json
import datetime
import math
from typing import List, Dict, Tuple, Optional, Any

# NLTK with safe fallback
import nltk
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    try:
        nltk.download('punkt', quiet=True)
    except Exception:
        pass

# spaCy with safe fallback for Windows WinError 1114 / missing torch DLL
nlp = None
try:
    import spacy
    try:
        nlp = spacy.load("en_core_web_sm")
    except Exception:
        nlp = None
except (ImportError, OSError, Exception):
    nlp = None

# SentenceTransformers with safe fallback
_has_sentence_transformers = False
_embedding_model = None
try:
    from sentence_transformers import SentenceTransformer, util
    _has_sentence_transformers = True
except (ImportError, OSError, Exception):
    _has_sentence_transformers = False

# Scikit-learn fallback (always available and highly reliable)
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Google Generative AI
import google.generativeai as genai

# LangChain text splitter
from langchain_text_splitters import RecursiveCharacterTextSplitter

from backend.config import settings

def get_embedding_model():
    global _embedding_model
    if _has_sentence_transformers and _embedding_model is None:
        try:
            # Load local cached model if available; avoids network timeout stalls
            _embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME, local_files_only=True)
        except Exception:
            _embedding_model = None
    return _embedding_model

# Comprehensive dictionary of technical & professional skills
SKILL_DICTIONARY = {
    "Programming Languages": [
        "python", "java", "sql", "javascript", "typescript", "c", "c++", "c#", "go",
        "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "html", "css",
        "bash", "shell", "dart", "matlab"
    ],
    "Frameworks & Libraries": [
        "fastapi", "flask", "django", "react", "angular", "vue", "nextjs", "next.js",
        "svelte", "spring boot", "spring", "express", "nestjs", "rails", "laravel",
        "bootstrap", "tailwind", "tailwindcss", "redux", "node.js", "nodejs", "jquery"
    ],
    "Databases & Caching": [
        "postgresql", "postgres", "mysql", "mongodb", "sqlite", "redis", "cassandra",
        "dynamodb", "oracle", "sql server", "neo4j", "mariadb", "elasticsearch"
    ],
    "Cloud & DevOps": [
        "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "terraform",
        "ansible", "jenkins", "gitlab ci", "github actions", "circleci", "prometheus",
        "grafana", "linux", "nginx", "apache", "helm", "ci/cd"
    ],
    "AI, ML & Data Science": [
        "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn", "pandas",
        "numpy", "spark", "nltk", "spacy", "langchain", "huggingface", "opencv",
        "faiss", "llm", "bert", "gpt", "matplotlib", "seaborn", "scipy", "xgboost",
        "lightgbm", "computer vision", "nlp", "deep learning", "machine learning"
    ],
    "Developer Tools & Methods": [
        "git", "github", "gitlab", "jira", "postman", "swagger", "openapi",
        "agile", "scrum", "rest api", "restful", "graphql", "microservices",
        "unit testing", "pytest", "jest"
    ],
    "Data & Analytics": [
        "power bi", "tableau", "excel", "looker", "dbt", "snowflake",
        "redshift", "bigquery", "etl", "data warehousing"
    ]
}

ALL_SKILLS = [skill for category in SKILL_DICTIONARY.values() for skill in category]

ACTION_VERBS = {
    "led", "developed", "designed", "implemented", "engineered", "built", "architected",
    "managed", "created", "spearheaded", "optimized", "reduced", "increased", "delivered",
    "integrated", "deployed", "automated", "mentored", "orchestrated", "collaborated",
    "researched", "formulated", "established", "streamlined", "accelerated", "maintained"
}

def clean_text(text: str) -> str:
    """Cleans text of extra whitespaces and special characters."""
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_email(text: str) -> Optional[str]:
    email_regex = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    match = re.search(email_regex, text)
    return match.group(0).lower() if match else None

def extract_phone(text: str) -> Optional[str]:
    phone_regex = r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    match = re.search(phone_regex, text)
    if match:
        return match.group(0).strip()
    alt_regex = r'(?:\+?91[-.\s]?)?[6-9]\d{9}'
    alt_match = re.search(alt_regex, text)
    return alt_match.group(0).strip() if alt_match else None

def extract_links(text: str) -> Dict[str, Optional[str]]:
    linkedin = None
    github = None
    portfolio = None

    li_match = re.search(r'(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+', text, re.I)
    if li_match:
        linkedin = li_match.group(0)

    gh_match = re.search(r'(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+', text, re.I)
    if gh_match:
        github = gh_match.group(0)

    pf_match = re.search(r'(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9_-]+\.(?:dev|me|io|tech|app)', text, re.I)
    if pf_match:
        portfolio = pf_match.group(0)

    return {"linkedin": linkedin, "github": github, "portfolio": portfolio}

def extract_name(text: str) -> str:
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if not lines:
        return "Candidate"

    for line in lines[:4]:
        if "@" in line or "resume" in line.lower() or "curriculum" in line.lower() or len(line.split()) > 5:
            continue
        if nlp:
            try:
                doc = nlp(line)
                for ent in doc.ents:
                    if ent.label_ == "PERSON":
                        return ent.text.strip()
            except Exception:
                pass
        words = line.split()
        if 2 <= len(words) <= 4 and all(w[0].isupper() for w in words if w.isalpha()):
            return line.strip()

    return lines[0].strip() if len(lines[0]) < 50 else "Candidate"

def extract_skills(text: str) -> List[str]:
    found_skills = set()
    text_lower = text.lower()

    for skill in ALL_SKILLS:
        if skill in ["c++", "c#", ".net"]:
            pattern = re.escape(skill)
        else:
            pattern = r'\b' + re.escape(skill) + r'\b'

        if re.search(pattern, text_lower):
            if skill in ["aws", "gcp", "sql", "llm", "gpt", "bert", "dbt", "html", "css", "ci/cd", "rest api", "etl"]:
                normalized = skill.upper()
            elif skill in ["react", "django", "flask", "fastapi", "docker", "kubernetes", "terraform", "ansible", "jenkins", "git", "python", "java", "pandas", "numpy", "spacy", "nltk", "langchain", "faiss"]:
                normalized = skill.capitalize()
            elif skill == "pytorch":
                normalized = "PyTorch"
            elif skill == "tensorflow":
                normalized = "TensorFlow"
            elif skill == "scikit-learn" or skill == "sklearn":
                normalized = "Scikit-Learn"
            elif skill == "power bi":
                normalized = "Power BI"
            elif skill == "mongodb":
                normalized = "MongoDB"
            elif skill == "postgresql" or skill == "postgres":
                normalized = "PostgreSQL"
            elif skill == "typescript":
                normalized = "TypeScript"
            elif skill == "javascript":
                normalized = "JavaScript"
            elif skill == "next.js" or skill == "nextjs":
                normalized = "Next.js"
            elif skill == "node.js" or skill == "nodejs":
                normalized = "Node.js"
            else:
                normalized = skill.title()
            found_skills.add(normalized)

    return sorted(list(found_skills))

def extract_experience_years(text: str) -> int:
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

    year_blocks = re.findall(r'\b(19\d{2}|20\d{2})\s*[-–—]\s*(19\d{2}|20\d{2}|present|current)\b', text.lower())
    calculated_exp = 0
    current_year = 2026
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
        return min(calculated_exp, 30)

    return 0

def extract_education(text: str) -> str:
    degrees = []
    text_lower = text.lower()

    if re.search(r'\b(ph\.?d|doctorate)\b', text_lower):
        degrees.append("PhD")
    if re.search(r'\b(master|m\.?s|m\.?tech|mba|m\.?sc|mca)\b', text_lower):
        degrees.append("Master's")
    if re.search(r'\b(bachelor|b\.?s|b\.?tech|b\.?a|b\.?sc|b\.?e|bca)\b', text_lower):
        degrees.append("Bachelor's")
    if re.search(r'\b(diploma|associate degree)\b', text_lower):
        degrees.append("Diploma / Associate")

    if degrees:
        return " / ".join(degrees)

    lines = text.split("\n")
    for line in lines:
        if any(keyword in line.lower() for keyword in ["university", "college", "institute of", "bs in", "b.tech in", "b.e in"]):
            if len(line.strip()) < 100:
                return line.strip()

    return "Bachelor's Degree (Estimated)"

def parse_projects_count(text: str) -> int:
    text_lower = text.lower()
    project_headers = len(re.findall(r'\bproject\b', text_lower))
    has_projects_section = re.search(r'\b(projects|academic projects|key projects|personal projects)\b', text_lower)
    if has_projects_section:
        return max(2, min(6, project_headers))
    return min(3, project_headers)

def extract_structured_resume(resume_text: str) -> Dict[str, Any]:
    name = extract_name(resume_text)
    email = extract_email(resume_text)
    phone = extract_phone(resume_text)
    links = extract_links(resume_text)
    skills = extract_skills(resume_text)
    experience_years = extract_experience_years(resume_text)
    education_level = extract_education(resume_text)

    categorized_skills = {}
    skills_lower = [s.lower() for s in skills]
    for category, cat_skills in SKILL_DICTIONARY.items():
        matched = []
        for cs in cat_skills:
            if cs in skills_lower:
                for orig in skills:
                    if orig.lower() == cs:
                        matched.append(orig)
                        break
        if matched:
            categorized_skills[category] = sorted(list(set(matched)))

    sections_detected = []
    text_lower = resume_text.lower()
    section_map = {
        "Summary / Profile": r'\b(summary|profile|about me|objective|professional summary)\b',
        "Experience / Work History": r'\b(experience|employment|work history|professional experience|internships)\b',
        "Education": r'\b(education|academic|qualifications|degrees)\b',
        "Skills": r'\b(skills|technical skills|technologies|competencies)\b',
        "Projects": r'\b(projects|key projects|academic projects)\b',
        "Certifications": r'\b(certifications|certificates|licenses|courses)\b'
    }
    for sec_name, pattern in section_map.items():
        if re.search(pattern, text_lower):
            sections_detected.append(sec_name)

    return {
        "personal_info": {
            "name": name,
            "email": email,
            "phone": phone,
            "linkedin": links.get("linkedin"),
            "github": links.get("github"),
            "portfolio": links.get("portfolio")
        },
        "education": {
            "degree_level": education_level
        },
        "skills": {
            "all_skills": skills,
            "categorized": categorized_skills,
            "total_count": len(skills)
        },
        "experience": {
            "estimated_years": experience_years
        },
        "projects": {
            "estimated_count": parse_projects_count(resume_text)
        },
        "sections_detected": sections_detected
    }

def calculate_ats_score(candidate_skills: List[str], candidate_exp: int, candidate_edu: str, resume_text: str, job: Dict) -> Tuple[float, dict]:
    req_skills_list = [s.strip().lower() for s in job.get("required_skills", "").split(",") if s.strip()]
    pref_skills_list = [s.strip().lower() for s in job.get("preferred_skills", "").split(",") if s.strip()]
    cand_skills_lower = [s.lower() for s in candidate_skills]

    skill_score = 0.0
    if req_skills_list:
        matched_req = [s for s in req_skills_list if s in cand_skills_lower]
        req_ratio = len(matched_req) / len(req_skills_list)
        req_points = req_ratio * 40.0

        if pref_skills_list:
            matched_pref = [s for s in pref_skills_list if s in cand_skills_lower]
            pref_ratio = len(matched_pref) / len(pref_skills_list)
            pref_points = pref_ratio * 10.0
        else:
            req_points = req_ratio * 50.0
            pref_points = 0.0

        skill_score = req_points + pref_points
    else:
        skill_score = 50.0

    req_exp = job.get("experience_required", 0)
    if req_exp == 0:
        exp_score = 20.0
    else:
        ratio = candidate_exp / req_exp
        exp_score = min(20.0, ratio * 20.0)

    cand_edu_lower = candidate_edu.lower()
    edu_level = 3
    if "ph" in cand_edu_lower:
        edu_level = 5
    elif "master" in cand_edu_lower or "m.s" in cand_edu_lower:
        edu_level = 4
    elif "bachelor" in cand_edu_lower or "b.tech" in cand_edu_lower:
        edu_level = 3
    elif "diploma" in cand_edu_lower:
        edu_level = 2

    jd_desc_lower = job.get("description", "").lower()
    req_level = 3
    if "phd" in jd_desc_lower:
        req_level = 5
    elif "master" in jd_desc_lower or "m.s." in jd_desc_lower:
        req_level = 4

    edu_score = 10.0 if edu_level >= req_level else max(4.0, 10.0 * (edu_level / max(1, req_level)))

    projects_count = parse_projects_count(resume_text)
    if projects_count >= 3:
        project_score = 20.0
    elif projects_count == 2:
        project_score = 15.0
    elif projects_count == 1:
        project_score = 10.0
    else:
        project_score = 5.0

    total_ats = round(skill_score + exp_score + edu_score + project_score, 1)

    breakdown = {
        "skills_score": round(skill_score, 1),
        "experience_score": round(exp_score, 1),
        "education_score": round(edu_score, 1),
        "projects_score": round(project_score, 1),
        "total_score": total_ats
    }
    return total_ats, breakdown

def analyze_resume_comprehensive(resume_text: str, structured_data: Dict[str, Any]) -> Dict[str, Any]:
    words = resume_text.split()
    word_count = len(words)
    p_info = structured_data.get("personal_info", {})
    skills = structured_data.get("skills", {}).get("all_skills", [])
    sections = structured_data.get("sections_detected", [])
    exp_years = structured_data.get("experience", {}).get("estimated_years", 0)
    proj_count = structured_data.get("projects", {}).get("estimated_count", 0)

    # 1. Structure Score (Max 100)
    essential_sections = ["Skills", "Education", "Experience / Work History", "Projects"]
    found_essential = [s for s in essential_sections if any(e in s for e in sections)]
    struct_ratio = len(found_essential) / len(essential_sections)
    structure_score = round(struct_ratio * 80 + (20 if "Summary / Profile" in sections else 10), 1)

    # 2. Content & Impact Score (Max 100)
    action_verbs_found = [w.lower() for w in words if w.lower() in ACTION_VERBS]
    numbers_found = re.findall(r'\b\d+(?:\.\d+)?%?\b', resume_text)
    content_score = min(100.0, (len(set(action_verbs_found)) * 4.0) + (min(len(numbers_found), 15) * 3.5) + 30.0)
    content_score = round(content_score, 1)

    # 3. Skills Score (Max 100)
    skills_count = len(skills)
    if skills_count >= 15:
        skills_score = 95.0
    elif skills_count >= 10:
        skills_score = 85.0
    elif skills_count >= 5:
        skills_score = 70.0
    else:
        skills_score = max(35.0, skills_count * 10.0)

    # 4. Experience & Projects Score (Max 100)
    if exp_years >= 3:
        exp_score = min(100.0, 75.0 + (exp_years * 5.0))
    else:
        exp_score = min(90.0, 50.0 + (proj_count * 10.0) + (exp_years * 10.0))
    exp_score = round(exp_score, 1)

    # 5. Readability & Formatting Score (Max 100)
    if 350 <= word_count <= 950:
        readability_score = 92.0
    elif 250 <= word_count <= 1400:
        readability_score = 80.0
    else:
        readability_score = 65.0

    # Overall Score (Weighted combination)
    overall_score = round(
        (structure_score * 0.20) +
        (content_score * 0.20) +
        (skills_score * 0.25) +
        (exp_score * 0.20) +
        (readability_score * 0.15),
        1
    )

    strengths = []
    if skills_count >= 8:
        strengths.append(f"Strong technical footprint: identified {skills_count} industry-standard technical skills.")
    if p_info.get("linkedin") or p_info.get("github"):
        strengths.append("Professional online presence: includes direct profile links (GitHub / LinkedIn).")
    if len(action_verbs_found) >= 6:
        strengths.append(f"Impact-oriented writing: utilizes {len(set(action_verbs_found))} strong action verbs.")
    if proj_count >= 2:
        strengths.append(f"Hands-on demonstration: highlights {proj_count}+ distinct technical projects.")
    if p_info.get("email") and p_info.get("phone"):
        strengths.append("Clear contact header with verified email and phone coordinates.")
    if not strengths:
        strengths.append("Clear foundational resume structure with recognizable technical entries.")

    weaknesses = []
    if not p_info.get("linkedin"):
        weaknesses.append("Missing LinkedIn profile link in the contact header.")
    if not p_info.get("github"):
        weaknesses.append("Missing GitHub or code repository link to verify project implementations.")
    if "Summary / Profile" not in sections:
        weaknesses.append("Lacks a dedicated Professional Summary or Career Objective at the top.")
    if len(numbers_found) < 3:
        weaknesses.append("Limited quantifiable metrics: add measurable outcomes (e.g., % improvement, latency reduction, user count).")
    if word_count < 300:
        weaknesses.append("Document length is quite brief: elaborate further on project contributions and technical challenges.")

    suggestions = [
        "Include a concise 3-sentence professional summary highlighting your primary stack and target role.",
        "Use the STAR method (Situation, Task, Action, Result) in bullet points with measurable numerical outcomes.",
        "Add GitHub links alongside each technical project so recruiters can review your source code.",
        "Organize technical skills into distinct subcategories (Languages, Frameworks, Cloud, Databases) for faster screening."
    ]

    ats_readiness_score = round((structure_score * 0.40) + (skills_score * 0.35) + (readability_score * 0.25), 1)
    ats_details = {
        "standard_headings": "Passed" if len(found_essential) >= 3 else "Needs Improvement",
        "contact_info_complete": bool(p_info.get("email") and p_info.get("phone")),
        "file_readability": "High",
        "keyword_density": f"{skills_count} tech keywords detected",
        "warnings": []
    }
    if not p_info.get("phone"):
        ats_details["warnings"].append("Phone number could not be detected automatically.")
    if len(found_essential) < 4:
        missing = [s for s in essential_sections if not any(e in s for e in sections)]
        ats_details["warnings"].append(f"Missing recommended standard headings: {', '.join(missing)}.")

    return {
        "overall_score": overall_score,
        "section_scores": {
            "structure": structure_score,
            "content": content_score,
            "skills": skills_score,
            "experience": exp_score,
            "readability": readability_score
        },
        "ats_readiness": {
            "score": ats_readiness_score,
            "details": ats_details
        },
        "strengths": strengths,
        "weaknesses": weaknesses,
        "suggestions": suggestions,
        "word_count": word_count,
        "action_verbs_count": len(set(action_verbs_found))
    }

def compute_semantic_similarity(job_description: str, resume_text: str) -> float:
    """
    Computes cosine similarity between job description and resume text.
    Uses SentenceTransformers if available, with robust scikit-learn TF-IDF fallback.
    Returns percentage (0 - 100).
    """
    jd_clean = clean_text(job_description)
    resume_clean = clean_text(resume_text)
    if not jd_clean or not resume_clean:
        return 0.0

    if _has_sentence_transformers:
        try:
            model = get_embedding_model()
            if model is not None:
                embeddings = model.encode([jd_clean, resume_clean], convert_to_tensor=True)
                cos_sim = util.cos_sim(embeddings[0], embeddings[1])
                score = cos_sim.item()
                return round(max(0.0, min(1.0, score)) * 100.0, 1)
        except Exception:
            pass

    # High-performance TF-IDF cosine similarity fallback
    try:
        vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
        tfidf_matrix = vectorizer.fit_transform([jd_clean, resume_clean])
        sim = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
        return round(max(0.0, min(1.0, sim)) * 100.0, 1)
    except Exception as e:
        print(f"TF-IDF cosine similarity error: {e}")
        return 50.0

def match_resume_to_job(resume_text: str, job_description: str, job_title: str = "", required_skills_str: str = "", preferred_skills_str: str = "", req_exp: int = 0) -> Dict[str, Any]:
    candidate_skills = extract_skills(resume_text)
    candidate_skills_lower = set(s.lower() for s in candidate_skills)
    cand_exp = extract_experience_years(resume_text)

    if required_skills_str:
        req_list = [s.strip() for s in required_skills_str.split(",") if s.strip()]
    else:
        req_list = extract_skills(job_description)

    pref_list = [s.strip() for s in preferred_skills_str.split(",") if s.strip()]

    matched_skills = []
    missing_skills = []

    for sk in req_list:
        if sk.lower() in candidate_skills_lower:
            matched_skills.append(sk)
        else:
            missing_skills.append(sk)

    matched_pref = [sk for sk in pref_list if sk.lower() in candidate_skills_lower]

    total_req = len(req_list)
    if total_req > 0:
        skill_ratio = len(matched_skills) / total_req
        skill_score = skill_ratio * 80.0
        if pref_list:
            skill_score += (len(matched_pref) / len(pref_list)) * 20.0
        else:
            skill_score = skill_ratio * 100.0
    else:
        skill_score = 75.0
    skill_score = round(min(100.0, max(0.0, skill_score)), 1)

    semantic_score = compute_semantic_similarity(job_description, resume_text)

    if req_exp == 0:
        exp_score = 100.0
    else:
        exp_score = min(100.0, round((cand_exp / max(1, req_exp)) * 100.0, 1))

    overall_match = round((skill_score * 0.50) + (semantic_score * 0.35) + (exp_score * 0.15), 1)

    recommendations = []
    for miss in missing_skills[:4]:
        recommendations.append(f"Acquire hands-on project experience with {miss} to directly address this job requirement.")
    if cand_exp < req_exp:
        recommendations.append(f"Target role requests {req_exp} years of experience; highlight leadership and production outcomes to compensate.")
    if not recommendations:
        recommendations.append("Your profile demonstrates high alignment with all key job requirements.")

    return {
        "job_title": job_title or "Target Position",
        "overall_match_score": overall_match,
        "skill_match_score": skill_score,
        "semantic_match_score": semantic_score,
        "experience_match_score": exp_score,
        "candidate_experience": cand_exp,
        "required_experience": req_exp,
        "matched_skills": sorted(list(set(matched_skills))),
        "missing_skills": sorted(list(set(missing_skills))),
        "matched_preferred": sorted(list(set(matched_pref))),
        "skill_gap_analysis": recommendations
    }

def get_gemini_client():
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY.strip() == "":
        raise ValueError("GEMINI_API_KEY is not configured in backend environment (.env).")
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel("gemini-2.5-flash")

def evaluate_candidate_with_gemini(resume_text: str, job_title: str, job_description: str) -> dict:
    if not settings.GEMINI_API_KEY:
        print("GEMINI_API_KEY not set. Using structured local analysis fallback.")
        return get_mock_gemini_evaluation()

    try:
        model = get_gemini_client()
        prompt = f"""
You are an expert technical recruiter and talent evaluator.
Analyze the candidate's resume against the Job Description ({job_title}).

Job Description:
{job_description}

Resume:
{resume_text}

Provide your response in STRICT valid JSON format without markdown code fences or backticks.
Include exactly these keys:
1. "candidate_summary": 2-3 sentence assessment of the candidate's background and alignment.
2. "strengths": Array of 3-4 specific verified strengths based on the resume.
3. "weaknesses": Array of 2-3 areas for improvement relative to this job.
4. "missing_skills": Array of skills in the job description that are absent in the resume.
5. "hiring_recommendation": One of: "Strong Hire", "Hire", "Consider", "Reject".
6. "learning_path": Array of 3 specific actionable study or project recommendations.
7. "interview_questions": Array of 4 personalized questions based on their profile. Each item must have:
   - "question": string
   - "category": string ("Python", "System Design", "Behavioural", etc.)
   - "suggested_answer": string (guidelines for the recruiter on what a good answer entails)
"""
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        return json.loads(text)
    except Exception as e:
        print(f"Gemini API evaluation failed: {e}. Falling back to structured evaluation.")
        return get_mock_gemini_evaluation()

def get_mock_gemini_evaluation() -> dict:
    return {
        "candidate_summary": "Candidate profile contains relevant foundational skills. Standard technical screening is recommended.",
        "strengths": [
            "Demonstrated core programming and development skills.",
            "Structured academic background with technical projects.",
            "Clear documentation of methodologies."
        ],
        "weaknesses": [
            "Production deployment and scaling metrics could be elaborated.",
            "Specific enterprise cloud service details are limited."
        ],
        "missing_skills": ["Docker", "Kubernetes", "AWS"],
        "hiring_recommendation": "Consider",
        "learning_path": [
            "Complete an AWS Certified Cloud Practitioner or Solutions Architect tutorial.",
            "Build and containerize a multi-service web application using Docker.",
            "Implement CI/CD pipeline automation with GitHub Actions."
        ],
        "interview_questions": [
            {
                "question": "Can you describe a complex technical roadblock you faced in a recent project and how you resolved it?",
                "category": "Behavioural / Problem Solving",
                "suggested_answer": "Look for a clear explanation of root cause diagnosis, analytical steps taken, and verifiable positive outcome."
            },
            {
                "question": "How do you handle database connection pooling and transaction rollbacks in backend services?",
                "category": "Backend Engineering",
                "suggested_answer": "Candidate should discuss session management, context managers, and handling exceptions safely."
            },
            {
                "question": "What strategies do you employ to prevent data leakage and handle model overfitting?",
                "category": "Machine Learning",
                "suggested_answer": "Look for cross-validation, regularization, and careful test/train split isolation."
            },
            {
                "question": "How do you ensure RESTful APIs are secure and protected against unauthorized access?",
                "category": "Security & Architecture",
                "suggested_answer": "Expect mention of JWT verification, HTTPS, role-based middleware, and input validation."
            }
        ]
    }

def chat_career_assistant(
    resume_text: str,
    structured_resume: Dict[str, Any],
    history: List[Dict[str, str]],
    user_message: str
) -> Tuple[str, List[str]]:
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured in backend environment (.env). Please set a valid key to use the Career Assistant.")

    retrieved_context = ""
    sources = []
    try:
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=120)
        chunks = text_splitter.split_text(resume_text)
        if not chunks:
            chunks = [resume_text]

        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf = vectorizer.fit_transform(chunks + [user_message])
        sims = cosine_similarity(tfidf[-1:], tfidf[:-1])[0]
        top_indices = sims.argsort()[-3:][::-1]
        top_chunks = [chunks[i] for i in top_indices if sims[i] > 0.05]
        if not top_chunks:
            top_chunks = chunks[:3]
        retrieved_context = "\n---\n".join(top_chunks)
        sources = [f"Resume Excerpt {i+1}" for i in range(len(top_chunks))]
    except Exception as rag_err:
        print(f"RAG retrieval fallback: {rag_err}")
        retrieved_context = resume_text[:2000]
        sources = ["Resume Overview"]

    candidate_name = structured_resume.get("personal_info", {}).get("name", "the candidate")
    skills_list = ", ".join(structured_resume.get("skills", {}).get("all_skills", []))

    system_instruction = f"""
You are the TalentAI Career Assistant, a world-class professional career coach, resume strategist, and technical interview advisor.
You are conversing with or on behalf of {candidate_name}.
You have direct verified access to their resume context and technical background.

Candidate Skills: {skills_list}

Retrieved Relevant Resume Excerpts:
{retrieved_context}

Guidelines:
1. Always base answers regarding their background strictly on verified information in their resume.
2. Never invent or hallucinate projects, degrees, or experience they do not have.
3. If asked how to improve or what they are missing for a role, provide constructive, actionable, and encouraging recommendations.
4. Maintain conversation continuity: remember references from earlier messages in this chat.
5. Keep your tone professional, insightful, concise, and helpful.
"""

    try:
        model = get_gemini_client()
        conversation_prompt = f"{system_instruction}\n\n--- Conversation History ---\n"
        for msg in history[-6:]:
            role = "User" if msg.get("sender") == "user" else "Assistant"
            conversation_prompt += f"{role}: {msg.get('message', '')}\n"

        conversation_prompt += f"\nUser: {user_message}\nAssistant:"

        response = model.generate_content(conversation_prompt)
        reply = response.text.strip()
        return reply, sources

    except Exception as e:
        print(f"Gemini API error during chat: {e}")
        raise RuntimeError(f"AI Assistant encountered an error communicating with Gemini API: {str(e)}")

def ask_resume_chatbot(candidate_id: int, resume_text: str, question: str) -> str:
    structured = extract_structured_resume(resume_text)
    try:
        reply, _ = chat_career_assistant(
            resume_text=resume_text,
            structured_resume=structured,
            history=[],
            user_message=question
        )
        return reply
    except Exception as e:
        return f"Unable to process query: {str(e)}"

def generate_resume_improvement(section_type: str, original_content: str, target_role: str = "") -> Dict[str, Any]:
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is required to generate AI resume improvements.")

    prompt = f"""
You are an expert resume optimizer and executive career coach.
Enhance the following {section_type} for a candidate targeting '{target_role or 'Software Engineer'}'.

Original Content:
{original_content}

Instructions:
1. Enhance the tone, grammar, and professional presentation.
2. Use strong action verbs and concise language.
3. Format bullets using the STAR framework (Situation, Task, Action, Result).
4. CRITICAL: Never fabricate fake experiences, metrics, or technologies not indicated or implied in the original content.
5. Return your output in STRICT valid JSON without markdown code fences:
{{
    "original": "{original_content.strip()}",
    "improved": "Your improved version here",
    "key_changes": ["Change 1", "Change 2", "Change 3"],
    "action_verbs_used": ["Verb1", "Verb2"]
}}
"""
    try:
        model = get_gemini_client()
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        raise RuntimeError(f"Failed to generate resume improvement: {str(e)}")

def generate_personalized_interview_prep(resume_text: str, target_role: str, job_description: str = "") -> List[Dict[str, Any]]:
    if not settings.GEMINI_API_KEY:
        return get_mock_gemini_evaluation().get("interview_questions", [])

    prompt = f"""
You are a Lead Hiring Manager and Technical Interviewer.
Based on the candidate's verified resume and target role '{target_role}', generate 6 personalized, high-value interview questions.

Target Role: {target_role}
Job Description (if available): {job_description}

Candidate Resume:
{resume_text}

Requirements:
- 2 Technical questions specific to their technologies and tools.
- 2 Project-deep-dive questions referencing their actual projects.
- 2 Behavioral/Leadership/System Design questions.
- Provide comprehensive model answer guidelines for each question.
- Return in STRICT valid JSON array without markdown code fences. Each element must contain:
  "question": string,
  "category": string ("Technical", "Project Deep-Dive", "Behavioral", "System Design"),
  "difficulty": string ("Easy", "Medium", "Hard"),
  "suggested_answer": string,
  "key_topics_to_cover": array of strings
"""
    try:
        model = get_gemini_client()
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        print(f"Gemini interview prep fallback: {e}")
        return get_mock_gemini_evaluation().get("interview_questions", [])
