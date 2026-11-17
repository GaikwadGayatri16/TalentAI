import os
import re
from typing import Tuple
import pdfplumber
import PyPDF2
from docx import Document

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}

class DocumentParsingError(Exception):
    """Custom exception raised when resume parsing fails."""
    pass

def validate_resume_file(filename: str, file_size: int = 0) -> str:
    """
    Validates file extension and size.
    Returns the normalized extension if valid, otherwise raises DocumentParsingError.
    """
    if not filename:
        raise DocumentParsingError("No file provided.")
        
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise DocumentParsingError(
            f"Unsupported file format '{ext}'. Allowed formats are PDF (.pdf), Word (.docx, .doc), and Text (.txt)."
        )
        
    if file_size > MAX_FILE_SIZE_BYTES:
        raise DocumentParsingError(
            f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB."
        )
        
    return ext

def clean_extracted_text(text: str) -> str:
    """Cleans extracted text by normalizing line breaks and removing null bytes."""
    if not text:
        return ""
    # Remove null characters
    text = text.replace("\x00", "")
    # Normalize multiple line breaks and trailing spaces
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def parse_pdf(file_path: str) -> str:
    """
    Parses a PDF file using pdfplumber as primary, falling back to PyPDF2.
    Detects password-protected PDFs and empty extractions.
    """
    text_chunks = []
    is_encrypted = False

    # Check for encryption first with PyPDF2
    try:
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            if reader.is_encrypted:
                is_encrypted = True
    except Exception as e:
        pass

    if is_encrypted:
        raise DocumentParsingError("The PDF file is password-protected or encrypted. Please provide an unencrypted PDF.")

    # Try pdfplumber first
    try:
        with pdfplumber.open(file_path) as pdf:
            if len(pdf.pages) == 0:
                raise DocumentParsingError("PDF file contains no pages.")
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text_chunks.append(page_text)
    except DocumentParsingError:
        raise
    except Exception as e:
        print(f"pdfplumber encountered error on {file_path}: {e}. Trying PyPDF2 fallback.")

    # If pdfplumber returned no text, fallback to PyPDF2
    full_text = "\n".join(text_chunks).strip()
    if not full_text:
        try:
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                fallback_chunks = []
                for page in reader.pages:
                    pt = page.extract_text()
                    if pt:
                        fallback_chunks.append(pt)
                full_text = "\n".join(fallback_chunks).strip()
        except Exception as e:
            print(f"PyPDF2 fallback also failed on {file_path}: {e}")

    cleaned = clean_extracted_text(full_text)
    if not cleaned:
        raise DocumentParsingError(
            "Could not extract meaningful text from this PDF. "
            "It may be an image-only scanned document without selectable text."
        )
    return cleaned

def parse_docx(file_path: str) -> str:
    """Parses a DOCX document extracting paragraphs and table cells."""
    try:
        doc = Document(file_path)
        chunks = []
        for para in doc.paragraphs:
            if para.text.strip():
                chunks.append(para.text.strip())
        for table in doc.tables:
            for row in table.rows:
                cells = [c.text.strip() for c in row.cells if c.text.strip()]
                if cells:
                    chunks.append(" | ".join(cells))
        full_text = "\n".join(chunks)
        cleaned = clean_extracted_text(full_text)
        if not cleaned:
            raise DocumentParsingError("Word document contains no readable text.")
        return cleaned
    except DocumentParsingError:
        raise
    except Exception as e:
        raise DocumentParsingError(f"Failed to parse Word document: {str(e)}")

def parse_txt(file_path: str) -> str:
    """Parses a plain text file supporting multiple encodings."""
    encodings = ["utf-8", "latin-1", "cp1252", "iso-8859-1"]
    content = ""
    for enc in encodings:
        try:
            with open(file_path, "r", encoding=enc) as f:
                content = f.read()
                break
        except UnicodeDecodeError:
            continue
        except Exception as e:
            raise DocumentParsingError(f"Failed to read text file: {str(e)}")

    cleaned = clean_extracted_text(content)
    if not cleaned:
        raise DocumentParsingError("Text file is empty.")
    return cleaned

def parse_resume(file_path: str) -> str:
    """
    Main entry point for document parsing.
    Validates file existence and delegates to appropriate format parser.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return parse_pdf(file_path)
    elif ext in [".docx", ".doc"]:
        return parse_docx(file_path)
    elif ext == ".txt":
        return parse_txt(file_path)
    else:
        # Fallback to text parsing
        return parse_txt(file_path)
