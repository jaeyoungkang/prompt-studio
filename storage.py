"""
Prompt Studio - File Storage Manager
JSON file-based storage for prompt templates
"""

import json
import os
import logging
from pathlib import Path
from typing import Dict, List, Optional
from string import Template

from models import PromptCategory, PromptTemplate

logger = logging.getLogger(__name__)


class PromptStorage:
    """File-based storage manager for prompts"""
    
    def __init__(self, prompts_dir: str = "prompts"):
        """
        Initialize storage manager
        
        Args:
            prompts_dir: Directory containing prompt JSON files
        """
        self.prompts_dir = Path(prompts_dir)
        self.prompts_dir.mkdir(exist_ok=True)
        
        logger.info(f"✅ Prompt storage initialized: {self.prompts_dir}")
    
    def list_categories(self) -> List[str]:
        """List all available prompt categories"""
        categories = []
        
        for json_file in self.prompts_dir.glob("*.json"):
            categories.append(json_file.stem)
        
        return sorted(categories)
    
    def get_category(self, category: str) -> Optional[PromptCategory]:
        """
        Load a specific prompt category
        
        Args:
            category: Category name
            
        Returns:
            PromptCategory or None if not found
        """
        file_path = self.prompts_dir / f"{category}.json"
        
        if not file_path.exists():
            logger.warning(f"Category file not found: {category}")
            return None
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Convert templates to PromptTemplate objects
            templates = {}
            for name, template_data in data.get('templates', {}).items():
                templates[name] = PromptTemplate(**template_data)
            
            prompt_category = PromptCategory(
                version=data.get('version', '1.0.0'),
                category=data.get('category', category),
                description=data.get('description', ''),
                templates=templates
            )
            
            logger.debug(f"📂 Loaded category: {category}")
            return prompt_category
            
        except Exception as e:
            logger.error(f"❌ Failed to load category {category}: {str(e)}")
            return None
    
    def save_category(self, category: str, prompt_category: PromptCategory) -> bool:
        """
        Save a prompt category to file
        
        Args:
            category: Category name
            prompt_category: PromptCategory object to save
            
        Returns:
            Success status
        """
        file_path = self.prompts_dir / f"{category}.json"
        
        try:
            # Create backup if file exists
            if file_path.exists():
                backup_path = file_path.with_suffix('.json.backup')
                with open(file_path, 'r', encoding='utf-8') as src:
                    with open(backup_path, 'w', encoding='utf-8') as dst:
                        dst.write(src.read())
                logger.info(f"💾 Created backup: {backup_path}")
            
            # Convert to JSON-serializable format
            data = {
                "version": prompt_category.version,
                "category": prompt_category.category,
                "description": prompt_category.description,
                "templates": {}
            }
            
            for name, template in prompt_category.templates.items():
                data["templates"][name] = {
                    "content": template.content,
                    "description": template.description,
                    "variables": template.variables,
                    "model": template.model,
                    "max_tokens": template.max_tokens
                }
            
            # Save to file with pretty formatting
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"✅ Saved category: {category}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to save category {category}: {str(e)}")
            return False
    
    def get_all_prompts(self) -> Dict[str, Dict]:
        """
        Get all prompts from all categories
        
        Returns:
            Dictionary with category summary information
        """
        all_prompts = {}
        total_templates = 0
        
        for category_name in self.list_categories():
            category = self.get_category(category_name)
            if category:
                template_count = len(category.templates)
                total_templates += template_count
                
                all_prompts[category_name] = {
                    "version": category.version,
                    "description": category.description,
                    "template_count": template_count,
                    "template_names": list(category.templates.keys())
                }
        
        return {
            "categories": all_prompts,
            "total_categories": len(all_prompts),
            "total_templates": total_templates
        }
    
    def test_prompt_rendering(self, category: str, template_name: str, variables: Dict) -> Dict:
        """
        Test prompt rendering with provided variables
        
        Args:
            category: Category name
            template_name: Template name
            variables: Variables to substitute
            
        Returns:
            Test result dictionary
        """
        try:
            prompt_category = self.get_category(category)
            if not prompt_category:
                return {
                    "success": False,
                    "error": f"Category '{category}' not found"
                }
            
            if template_name not in prompt_category.templates:
                return {
                    "success": False,
                    "error": f"Template '{template_name}' not found in category '{category}'"
                }
            
            template_obj = prompt_category.templates[template_name]
            template_content = template_obj.content
            
            # Use Python string Template for safe substitution
            template = Template(template_content)
            
            # Find missing variables
            template_vars = set(template.get_identifiers())
            provided_vars = set(variables.keys())
            missing_vars = list(template_vars - provided_vars)
            
            # Render with safe_substitute (leaves missing vars as-is)
            rendered_prompt = template.safe_substitute(**variables)
            
            return {
                "success": True,
                "rendered_prompt": rendered_prompt,
                "missing_variables": missing_vars,
                "template_variables": list(template_vars),
                "provided_variables": list(provided_vars)
            }
            
        except Exception as e:
            logger.error(f"❌ Prompt rendering test failed: {str(e)}")
            return {
                "success": False,
                "error": f"Rendering failed: {str(e)}"
            }
    
    def get_category_file_path(self, category: str) -> Path:
        """Get the file path for a category"""
        return self.prompts_dir / f"{category}.json"
    
    def backup_category(self, category: str) -> bool:
        """Create a timestamped backup of a category"""
        from datetime import datetime
        
        file_path = self.get_category_file_path(category)
        if not file_path.exists():
            return False
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = file_path.with_name(f"{category}_{timestamp}.backup.json")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as src:
                with open(backup_path, 'w', encoding='utf-8') as dst:
                    dst.write(src.read())
            
            logger.info(f"📦 Created timestamped backup: {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Backup creation failed: {str(e)}")
            return False