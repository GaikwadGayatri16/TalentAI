import json
from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine, Base
from backend.models import User, Job, Candidate, Resume, Skill, CandidateScore
from backend.auth import get_password_hash
from backend.nlp import calculate_ats_score, compute_semantic_similarity

def seed_db():
    print("Seeding database...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    # 1. Create Users
    admin_pw = get_password_hash("admin123")
    recruiter_pw = get_password_hash("recruiter123")
    
    admin = User(name="Admin User", email="admin@talentai.com", password_hash=admin_pw, role="admin")
    recruiter = User(name="Jane Recruiter", email="recruiter@talentai.com", password_hash=recruiter_pw, role="recruiter")
    
    db.add(admin)
    db.add(recruiter)
    db.commit()
    db.refresh(admin)
    db.refresh(recruiter)
    
    # 2. Create Jobs
    job1 = Job(
        title="Senior Python Backend Developer",
        company="TechNova Solutions",
        description=(
            "We are seeking a Senior Python Backend Developer to build scalable APIs and database architectures. "
            "You will design secure REST APIs using FastAPI/Django, deploy microservices with Docker and Kubernetes, "
            "and optimize PostgreSQL queries. Cloud experience with AWS or GCP is highly required."
        ),
        required_skills="Python,FastAPI,PostgreSQL,Docker,AWS",
        preferred_skills="Kubernetes,Redis,TypeScript,FastAPI",
        experience_required=5,
        created_by=recruiter.id
    )
    
    job2 = Job(
        title="Machine Learning Engineer",
        company="AI Labs Inc.",
        description=(
            "Join our AI research team to build and deploy state-of-the-art predictive models. "
            "You will write processing pipelines in Pandas/NumPy, train neural networks using PyTorch/TensorFlow, "
            "and configure FAISS vector databases for RAG applications. Experienced in NLP models (LLM, BERT) is preferred."
        ),
        required_skills="Python,PyTorch,TensorFlow,Scikit-Learn,Pandas,SQL",
        preferred_skills="LangChain,FAISS,LLM,Docker",
        experience_required=3,
        created_by=recruiter.id
    )
    
    db.add(job1)
    db.add(job2)
    db.commit()
    db.refresh(job1)
    db.refresh(job2)
    
    # 3. Create Candidates & Resumes
    # Candidate 1: Perfect fit for Python Job
    c1_resume_text = """
    ALICE SMITH
    Email: alice.smith@email.com | Phone: 555-0192 | GitHub: github.com/alicesmith
    
    PROFESSIONAL SUMMARY
    Senior Backend Software Engineer with 6 years of experience building high-throughput APIs in Python.
    Expertise in microservices containerization, database clustering, and AWS cloud migrations.
    
    TECHNICAL SKILLS
    Languages: Python, SQL, JavaScript
    Frameworks: FastAPI, Flask, Django
    Databases: PostgreSQL, Redis, MySQL
    Cloud & DevOps: AWS (EC2, RDS, S3), Docker, Kubernetes, Jenkins
    
    PROFESSIONAL EXPERIENCE
    Senior Backend Engineer | CloudScale Inc. | 2022 - Present
    - Architected and built 15+ microservices using FastAPI processing 10M+ daily requests.
    - Containerized development environments using Docker, orchestrating clusters with Kubernetes.
    - Optimized Postgres queries, reducing database latency by 45%.
    
    Software Engineer | DevCorp | 2020 - 2022
    - Developed REST APIs using Django and Flask.
    - Configured CI/CD pipelines via Jenkins, automating deployments to AWS EC2.
    
    EDUCATION
    Bachelor of Science in Computer Science | State University | 2016 - 2020
    
    PROJECTS
    - TechCommerce API: High-performance e-commerce gateway built in Python/FastAPI using PostgreSQL and Docker.
    - CloudDeployer: Open-source CLI tool to orchestrate AWS infrastructure setups.
    """
    
    # Candidate 2: Perfect fit for ML Job
    c2_resume_text = """
    CHARLIE BROWN
    Email: charlie.brown@email.com | Phone: 555-0283 | Website: charlieai.dev
    
    SUMMARY
    Machine Learning Practitioner with 4 years of experience designing and optimizing deep learning models.
    Specialized in NLP pipelines, embeddings matching, and LLM orchestration.
    
    SKILLS
    Languages: Python, R, SQL, C++
    Frameworks: PyTorch, TensorFlow, Scikit-Learn
    Data Packages: Pandas, NumPy, Matplotlib, SciPy
    AI Concepts: LLM, BERT, NLP, RAG, Vector Search, FAISS, LangChain
    Cloud: Docker, AWS (S3, SageMaker)
    
    EXPERIENCE
    AI Scientist | DeepMinded Tech | 2022 - Present
    - Implemented a custom Retrieval-Augmented Generation (RAG) chatbot using LangChain, FAISS, and PyTorch.
    - Fine-tuned BERT and custom LLM models for text classification tasks, increasing F1-score by 12%.
    - Managed data processing pipelines handling 5TB of text datasets using Pandas and NumPy.
    
    Machine Learning Engineer | DataCraft | 2020 - 2022
    - Trained predictive models using Scikit-Learn to improve recommendation CTR.
    - Deployed models as microservices using Docker on AWS SageMaker.
    
    EDUCATION
    PhD in Data Science | Tech Institute | 2017 - 2020
    Master of Science in Statistics | Tech Institute | 2015 - 2017
    
    PROJECTS
    - SemanticSearch: Vector database semantic engine built with PyTorch and FAISS.
    - ChatResume: LangChain-powered resume analyzer utilizing generative LLMs.
    """
    
    # Candidate 3: Generalist Frontend / Full Stack (moderate match for both)
    c3_resume_text = """
    BOB JONES
    Email: bob.jones@email.com | Phone: 555-0374
    
    OBJECTIVE
    Passionate Frontend Developer with 2 years of experience looking to build responsive user interfaces.
    
    TECHNICAL SKILLS
    Languages: JavaScript, HTML, CSS, SQL, Python
    Frameworks & Tools: React, Nextjs, Bootstrap, Tailwind CSS, Git
    Databases: MySQL, SQLite
    
    EXPERIENCE
    Junior Frontend Developer | DesignWebs | 2021 - Present
    - Designed and implemented 20+ responsive landing pages using React and Tailwind CSS.
    - Integrated backend REST API responses with UI components.
    - Handled local database configuration using SQLite.
    
    Web Developer Intern | StartUp Solutions | 2020 - 2021
    - Assisted in styling dashboards with CSS and Bootstrap.
    
    EDUCATION
    Associate Degree in Information Systems | Community College | 2018 - 2020
    
    PROJECTS
    - ReactDashboard: Admin panel built in React using Recharts for analytics reporting.
    - PortfolioSite: Tailwind CSS based responsive web profile.
    """
    
    candidates_data = [
        ("Alice Smith", "alice.smith@email.com", "555-0192", 6, "Bachelor's", ["Python", "SQL", "JavaScript", "FastAPI", "Django", "PostgreSQL", "Redis", "AWS", "Docker", "Kubernetes"], c1_resume_text),
        ("Charlie Brown", "charlie.brown@email.com", "555-0283", 4, "PhD", ["Python", "SQL", "PyTorch", "TensorFlow", "Scikit-Learn", "Pandas", "Docker", "AWS", "LangChain", "FAISS"], c2_resume_text),
        ("Bob Jones", "bob.jones@email.com", "555-0374", 2, "Associate/Diploma", ["JavaScript", "HTML", "CSS", "SQL", "Python", "React", "Nextjs", "Tailwind"], c3_resume_text)
    ]
    
    candidates = []
    for name, email, phone, exp, edu, skills, resume_text in candidates_data:
        cand = Candidate(name=name, email=email, phone=phone, experience=exp, education=edu)
        db.add(cand)
        db.flush()
        
        # Add skills
        for skill_name in skills:
            skill = db.query(Skill).filter(Skill.skill_name == skill_name).first()
            if not skill:
                skill = Skill(skill_name=skill_name)
                db.add(skill)
                db.flush()
            cand.skills.append(skill)
            
        # Add resume record
        res_path = f"./uploads/mock_resume_{cand.id}.txt"
        resume = Resume(candidate_id=cand.id, resume_path=res_path, parsed_text=resume_text)
        db.add(resume)
        db.flush()
        candidates.append((cand, resume_text, skills))
        
    db.commit()
    
    # 4. Calculate Scores and Ranks
    jobs = [job1, job2]
    
    for job in jobs:
        job_dict = {
            "title": job.title,
            "company": job.company,
            "description": job.description,
            "required_skills": job.required_skills,
            "preferred_skills": job.preferred_skills,
            "experience_required": job.experience_required
        }
        
        for cand, resume_text, skills in candidates:
            # ATS Score
            ats_score, ats_breakdown = calculate_ats_score(
                candidate_skills=skills,
                candidate_exp=cand.experience,
                candidate_edu=cand.education,
                resume_text=resume_text,
                job=job_dict
            )
            
            # Semantic similarity
            sim_score = compute_semantic_similarity(
                job_description=job.description,
                resume_text=resume_text
            )
            
            final_score = round((ats_score * 0.6) + (sim_score * 0.4), 1)
            
            # Mock Gemini evaluations based on candidate profile to speed up/fail safe seed
            is_alice_for_python = (cand.name == "Alice Smith" and job.title == "Senior Python Backend Developer")
            is_charlie_for_ml = (cand.name == "Charlie Brown" and job.title == "Machine Learning Engineer")
            
            if is_alice_for_python:
                hiring_rec = "Strong Hire"
                eval_data = {
                    "candidate_summary": "Alice is an outstanding fit for the Senior Python Developer role. She possesses 6 years of Python experience, has direct experience building REST APIs with FastAPI/Django, and is proficient with Docker and AWS.",
                    "strengths": ["6 years of hands-on Python & FastAPI microservices development", "Extensive experience with PostgreSQL tuning and Docker configurations", "Practical AWS cloud deployment knowledge"],
                    "weaknesses": ["Limited exposure to frontend TypeScript frameworks", "Lacks complex Kubernetes multi-cluster routing descriptions"],
                    "missing_skills": ["Kubernetes", "TypeScript"],
                    "hiring_recommendation": "Strong Hire",
                    "learning_path": ["Complete a Kubernetes advanced networking tutorial.", "Learn frontend basics using TypeScript and React.", "Explore Redis caching architectures for state distribution."],
                    "interview_questions": [
                        {"question": "How do you handle connection pooling and transaction rollbacks in FastAPI with SQLAlchemy?", "category": "Python", "suggested_answer": "Look for descriptions of depends injection context managers, SessionLocal generators, and commit try-except-rollback blocks."},
                        {"question": "Describe your process for diagnosing and fixing a slow-running SQL query in PostgreSQL.", "category": "SQL", "suggested_answer": "Candidate should mention using EXPLAIN ANALYZE, checking for missing indexes, and evaluating query joins."},
                        {"question": "What is the difference between Docker CMD and ENTRYPOINT directives?", "category": "DevOps", "suggested_answer": "CMD can be overridden by command line arguments, whereas ENTRYPOINT is the hardcoded command executable."},
                        {"question": "Tell us about a time you had to optimize a microservice handling massive concurrent traffic.", "category": "Behavioural", "suggested_answer": "Check for description of bottlenecks, load testing tools, vertical/horizontal scaling, and cache application."}
                    ]
                }
            elif is_charlie_for_ml:
                hiring_rec = "Strong Hire"
                eval_data = {
                    "candidate_summary": "Charlie is a highly qualified candidate with a PhD in Data Science and 4 years of experience. He is deeply skilled in deep learning using PyTorch/TensorFlow, and has implemented production RAG pipelines using LangChain and FAISS.",
                    "strengths": ["PhD in Data Science with strong theoretical and mathematical foundation", "Direct experience building RAG chatbot pipelines using LangChain and FAISS", "Experienced in training large scale neural networks in PyTorch"],
                    "weaknesses": ["Lacks experience in full Kubernetes production orchestration", "Minimal references to standard frontend integration"],
                    "missing_skills": ["Docker", "Kubernetes"],
                    "hiring_recommendation": "Strong Hire",
                    "learning_path": ["Gain practical experience containerizing models using Docker.", "Learn to deploy models as web endpoints using FastAPI.", "Explore cloud deployment patterns on AWS SageMaker."],
                    "interview_questions": [
                        {"question": "Explain how standard Retrieval-Augmented Generation (RAG) pipelines work and how FAISS contributes to performance.", "category": "Machine Learning", "suggested_answer": "RAG extracts user query embeddings, performs vector search in FAISS, pulls matching chunks, and appends them to LLM context."},
                        {"question": "What are the key differences in graph compilation between PyTorch and TensorFlow?", "category": "Machine Learning", "suggested_answer": "PyTorch uses dynamic computational graphs (eager execution), whereas TensorFlow historically relied on static graphs (now supports eager too)."},
                        {"question": "How do you handle imbalanced datasets when training a classifier?", "category": "Machine Learning", "suggested_answer": "Expect mention of downsampling, SMOTE, class-weight adjustments in loss functions, and precision/recall evaluation."},
                        {"question": "Explain a challenging research problem you solved during your PhD.", "category": "Behavioural", "suggested_answer": "Look for research rigor, systematic problem formulation, experimental design, and perseverance."}
                    ]
                }
            else:
                # Moderate/Consider match
                hiring_rec = "Consider" if final_score > 60 else "Reject"
                eval_data = {
                    "candidate_summary": f"{cand.name} is a candidate with partial alignment. They exhibit good programming fundamentals, but lack specific deep knowledge requested in the JD.",
                    "strengths": ["Basic programming knowledge in Python and SQL", "Enthusiastic and details projects clearly", "Good foundation in web tech (JavaScript, React)"],
                    "weaknesses": ["No senior-level systems design experience", "Missing multiple core skills outlined in the JD"],
                    "missing_skills": ["FastAPI", "Docker", "PyTorch", "TensorFlow", "Kubernetes", "AWS"][:4],
                    "hiring_recommendation": hiring_rec,
                    "learning_path": ["Build structured hands-on projects using Python backend frameworks.", "Complete intermediate courses in backend system design.", "Learn basic cloud deployment options."],
                    "interview_questions": [
                        {"question": "What is the difference between Javascript let, const, and var declarations?", "category": "Programming", "suggested_answer": "var is function-scoped; let and const are block-scoped. const variables cannot be reassigned."},
                        {"question": "Explain the concept of state management in React.", "category": "React", "suggested_answer": "State is a reactive storage in a component. Changes to state trigger component re-render."},
                        {"question": "What is a primary key vs a foreign key in SQL databases?", "category": "SQL", "suggested_answer": "Primary key uniquely identifies a row; foreign key links a column to another table's primary key."},
                        {"question": "Describe a conflict you had with a team member and how you resolved it.", "category": "Behavioural", "suggested_answer": "Look for active listening, professional communication, and compromise."}
                    ]
                }
                
            score_entry = CandidateScore(
                candidate_id=cand.id,
                job_id=job.id,
                ats_score=ats_score,
                similarity_score=sim_score,
                final_score=final_score,
                hiring_recommendation=hiring_rec,
                evaluation_json=json.dumps(eval_data)
            )
            db.add(score_entry)
            
        db.commit()
        
        # Rank them
        all_scores = db.query(CandidateScore).filter(CandidateScore.job_id == job.id).order_by(CandidateScore.final_score.desc()).all()
        for idx, s in enumerate(all_scores):
            s.rank = idx + 1
        db.commit()
        
    db.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_db()
