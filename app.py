"""
Prompt Studio - FastAPI Application
Simple web-based prompt management system
"""

import os
import logging
from pathlib import Path
from typing import Dict, Any
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from models import (
    PromptCategory, 
    PromptTestRequest, 
    PromptTestResponse,
    PromptListResponse,
    PromptUpdateRequest
)
from storage import PromptStorage

load_dotenv('.env.local')

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Prompt Studio",
    description="Simple prompt management system",
    version="1.0.0"
)

# Initialize storage
storage = PromptStorage()

# Setup static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Simple API key authentication
API_KEY = os.getenv("PROMPT_STUDIO_API_KEY", "prompt-studio-dev-key")
security = HTTPBearer()


def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Simple API key verification"""
    if credentials.credentials != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return credentials.credentials


# === WEB ROUTES ===

@app.get("/", response_class=HTMLResponse)
async def admin_interface(request: Request):
    """Serve the admin web interface"""
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    categories = storage.list_categories()
    
    return {
        "status": "healthy",
        "service": "prompt-studio",
        "version": "1.0.0",
        "categories_count": len(categories),
        "available_categories": categories
    }


# === API ROUTES ===

@app.get("/api/prompts", response_model=PromptListResponse)
async def list_all_prompts(api_key: str = Depends(verify_api_key)):
    """
    List all available prompts with summary information
    """
    try:
        all_prompts = storage.get_all_prompts()
        
        return PromptListResponse(
            success=True,
            categories=all_prompts["categories"],
            total_categories=all_prompts["total_categories"],
            total_templates=all_prompts["total_templates"]
        )
    
    except Exception as e:
        logger.error(f"❌ Failed to list prompts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/prompts/{category}")
async def get_prompt_category(
    category: str, 
    api_key: str = Depends(verify_api_key)
) -> Dict[str, Any]:
    """
    Get a specific prompt category with all templates
    """
    try:
        prompt_category = storage.get_category(category)
        
        if not prompt_category:
            raise HTTPException(status_code=404, detail=f"Category '{category}' not found")
        
        # Convert to dictionary for JSON response
        return {
            "success": True,
            "category": prompt_category.dict()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get category {category}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/prompts/{category}")
async def update_prompt_category(
    category: str,
    request: PromptUpdateRequest,
    api_key: str = Depends(verify_api_key)
) -> Dict[str, Any]:
    """
    Update a prompt category
    """
    try:
        # Create backup before updating
        storage.backup_category(category)
        
        # Save the updated category
        success = storage.save_category(category, request.data)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save category")
        
        logger.info(f"✅ Updated category: {category}")
        
        return {
            "success": True,
            "message": f"Category '{category}' updated successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to update category {category}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/prompts/test", response_model=PromptTestResponse)
async def test_prompt_rendering(
    request: PromptTestRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Test prompt rendering with provided variables
    """
    try:
        result = storage.test_prompt_rendering(
            request.category,
            request.template_name,
            request.variables
        )
        
        return PromptTestResponse(
            success=result["success"],
            rendered_prompt=result.get("rendered_prompt"),
            error=result.get("error"),
            missing_variables=result.get("missing_variables", [])
        )
    
    except Exception as e:
        logger.error(f"❌ Prompt test failed: {str(e)}")
        return PromptTestResponse(
            success=False,
            error=str(e)
        )


@app.get("/api/prompts/{category}/{template_name}")
async def get_specific_template(
    category: str,
    template_name: str,
    api_key: str = Depends(verify_api_key)
) -> Dict[str, Any]:
    """
    Get a specific template from a category
    """
    try:
        prompt_category = storage.get_category(category)
        
        if not prompt_category:
            raise HTTPException(status_code=404, detail=f"Category '{category}' not found")
        
        if template_name not in prompt_category.templates:
            raise HTTPException(
                status_code=404, 
                detail=f"Template '{template_name}' not found in category '{category}'"
            )
        
        template = prompt_category.templates[template_name]
        
        return {
            "success": True,
            "category": category,
            "template_name": template_name,
            "template": template.dict()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get template {category}.{template_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# === ADMIN API ROUTES ===

@app.get("/api/admin/categories")
async def list_categories(api_key: str = Depends(verify_api_key)):
    """List all category names"""
    try:
        categories = storage.list_categories()
        return {
            "success": True,
            "categories": categories,
            "count": len(categories)
        }
    except Exception as e:
        logger.error(f"❌ Failed to list categories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/backup/{category}")
async def create_backup(
    category: str,
    api_key: str = Depends(verify_api_key)
):
    """Create a timestamped backup of a category"""
    try:
        success = storage.backup_category(category)
        
        if not success:
            raise HTTPException(status_code=404, detail=f"Category '{category}' not found")
        
        return {
            "success": True,
            "message": f"Backup created for category '{category}'"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Backup creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    
    logger.info("🚀 Starting Prompt Studio...")
    logger.info(f"🔑 API Key: {API_KEY}")
    logger.info(f"📁 Prompts directory: {storage.prompts_dir}")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )