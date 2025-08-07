"""
Prompt Studio - Data Models
Simple Pydantic models for prompt management
"""

from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field


class PromptTemplate(BaseModel):
    """Individual prompt template model"""
    content: str
    description: Optional[str] = ""
    variables: List[str] = Field(default_factory=list)
    model: Optional[str] = "claude-3-5-sonnet-20241022"
    max_tokens: Optional[int] = 1000


class PromptCategory(BaseModel):
    """Prompt category containing multiple templates"""
    version: str = "1.0.0"
    category: str
    description: str = ""
    templates: Dict[str, PromptTemplate]


class PromptTestRequest(BaseModel):
    """Request model for testing prompt with variables"""
    category: str
    template_name: str
    variables: Dict[str, Any] = Field(default_factory=dict)


class PromptTestResponse(BaseModel):
    """Response model for prompt testing"""
    success: bool
    rendered_prompt: Optional[str] = None
    error: Optional[str] = None
    missing_variables: List[str] = Field(default_factory=list)


class PromptListResponse(BaseModel):
    """Response model for listing all prompts"""
    success: bool
    categories: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    total_categories: int = 0
    total_templates: int = 0


class PromptUpdateRequest(BaseModel):
    """Request model for updating a prompt category"""
    data: PromptCategory