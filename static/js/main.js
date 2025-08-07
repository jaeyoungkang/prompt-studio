// main.js

import { ApiService } from './api.js';
import { UIManager } from './ui.js';

class PromptStudio {
    constructor() {
        this.apiKey = null;
        this.editor = null;
        this.currentCategory = null;
        this.currentTemplate = null;
        this.categories = {};
        this.unsavedChanges = false;
        
        // 의존성 주입
        this.api = ApiService;
        this.ui = UIManager;
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Prompt Studio...');
        this.setupEventListeners();
        
        this.apiKey = localStorage.getItem('prompt_studio_api_key');
        if (!this.apiKey) {
            this.ui.showApiKeyModal();
        } else {
            await this.connectToAPI();
        }
    }

    setupEventListeners() {
        // API 키 저장
        document.getElementById('saveApiKeyBtn').addEventListener('click', () => this.saveApiKey());
        this.ui.elements.apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveApiKey();
        });

        // 주요 버튼
        this.ui.elements.buttons.save.addEventListener('click', () => this.saveCurrentPrompt());
        this.ui.elements.buttons.test.addEventListener('click', () => this.testCurrentPrompt());
        this.ui.elements.buttons.backup.addEventListener('click', () => this.createBackup());
        this.ui.elements.buttons.format.addEventListener('click', () => this.formatEditor());
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadCategories());

        // 검색
        this.ui.elements.searchInput.addEventListener('input', (e) => this.filterPrompts(e.target.value));

        // 변수 추가
        document.getElementById('addVariableBtn').addEventListener('click', () => this.addCustomVariable());
        
        // 테스트 모달 닫기
        this.ui.elements.buttons.closeTestModal.addEventListener('click', () => this.ui.hideTestResultsModal());
        this.ui.elements.testResultsModal.addEventListener('click', (e) => {
             if (e.target === this.ui.elements.testResultsModal) this.ui.hideTestResultsModal();
        });

        // 키보드 단축키
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 's') { e.preventDefault(); this.saveCurrentPrompt(); }
                if (e.key === 'r' || e.key === 'e') { e.preventDefault(); this.testCurrentPrompt(); } // Ctrl+E or Ctrl+R for test
            }
        });

        // 페이지 이탈 방지
        window.addEventListener('beforeunload', (e) => {
            if (this.unsavedChanges) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });
    }

    saveApiKey() {
        const apiKey = this.ui.elements.apiKeyInput.value.trim();
        if (!apiKey) {
            this.ui.showToast('Please enter an API key', 'error');
            return;
        }
        this.apiKey = apiKey;
        localStorage.setItem('prompt_studio_api_key', apiKey);
        this.ui.hideApiKeyModal();
        this.connectToAPI();
    }

    async connectToAPI() {
        this.ui.updateConnectionStatus('connecting', 'Connecting...');
        try {
            await this.api.getCategories(this.apiKey); // Test connection
            this.ui.updateConnectionStatus('connected', 'Connected');
            await this.loadCategories();
            this.setupMonacoEditor();
        } catch (error) {
            console.error('Connection failed:', error);
            this.ui.updateConnectionStatus('disconnected', 'Connection failed');
            this.ui.showToast(error.message || 'Failed to connect. Check API key.', 'error');
            this.ui.showApiKeyModal();
        }
    }

    setupMonacoEditor() {
        if (this.editor) return;
        require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.34.0/min/vs' } });
        require(['vs/editor/editor.main'], () => {
            this.editor = monaco.editor.create(document.getElementById('editorContainer'), {
                value: '// Select a template to start editing',
                language: 'json',
                theme: 'vs-light',
                automaticLayout: true,
                minimap: { enabled: false },
                wordWrap: 'on',
                readOnly: true,
            });
            this.editor.onDidChangeModelContent(() => {
                if (!this.editor.getOption(monaco.editor.EditorOption.readOnly)) {
                    this.unsavedChanges = true;
                    this.updatePreview();
                    this.ui.updateUI(this.currentCategory, this.currentTemplate, this.unsavedChanges);
                }
            });
            console.log('✅ Monaco Editor initialized');
        });
    }

    async loadCategories() {
        this.ui.showStatus('Loading categories...');
        try {
            const data = await this.api.getCategories(this.apiKey);
            this.categories = data.categories;
            this.ui.renderCategoryList(this.categories, 
                (category, template) => this.loadTemplate(category, template),
                // (el, name) => this.ui.toggleCategory(el, name) // Flowbite handles this now
            );
            this.ui.showStatus(`Loaded ${data.total_categories} categories, ${data.total_templates} templates.`);
        } catch (error) {
            this.ui.showToast('Failed to load categories.', 'error');
            this.ui.showStatus('Error loading categories.');
        }
    }

    async loadTemplate(categoryName, templateName) {
        if (this.unsavedChanges && !confirm('You have unsaved changes. Continue without saving?')) {
            return;
        }

        this.ui.showStatus(`Loading ${categoryName}.${templateName}...`);
        try {
            const data = await this.api.getCategory(categoryName, this.apiKey);
            const template = data.category.templates[templateName];
            if (!template) throw new Error(`Template '${templateName}' not found`);

            this.currentCategory = categoryName;
            this.currentTemplate = templateName;
            
            const fullContent = JSON.stringify(data.category, null, 2);
            this.editor.setValue(fullContent);
            this.editor.updateOptions({ readOnly: false });
            this.editor.setPosition({ lineNumber: 1, column: 1 });
            this.editor.focus();

            this.ui.updateTemplateInfo(template);
            this.ui.updateVariableInputs(template.variables || []);
            this.ui.updateActiveStates(categoryName, templateName);
            
            this.unsavedChanges = false;
            this.ui.updateUI(this.currentCategory, this.currentTemplate, this.unsavedChanges);
            this.ui.showStatus(`Loaded ${categoryName}.${templateName}`);
            this.updatePreview();

        } catch (error) {
            console.error(error);
            this.ui.showToast(`Failed to load template: ${error.message}`, 'error');
            this.ui.showStatus('Error loading template.');
        }
    }

    async saveCurrentPrompt() {
        if (!this.currentCategory || !this.editor) return;

        this.ui.showStatus('Saving...');
        try {
            const editorContent = this.editor.getValue();
            const categoryData = JSON.parse(editorContent);
            
            await this.api.updateCategory(this.currentCategory, categoryData, this.apiKey);

            this.unsavedChanges = false;
            this.ui.showToast('Prompt saved successfully!', 'success');
            this.ui.showStatus(`Saved ${this.currentCategory}.${this.currentTemplate}`);
            this.ui.updateUI(this.currentCategory, this.currentTemplate, this.unsavedChanges);

            // Reload categories to reflect potential changes in counts or versions
            await this.loadCategories();
            this.ui.updateActiveStates(this.currentCategory, this.currentTemplate);

        } catch (error) {
            this.ui.showToast(`Save failed: ${error.message}`, 'error');
            this.ui.showStatus('Save failed.');
        }
    }

    async testCurrentPrompt() {
        if (!this.currentCategory || !this.currentTemplate) return;

        this.ui.showStatus('Testing prompt...');
        const variables = {};
        this.ui.elements.variableInputs.querySelectorAll('.variable-input').forEach(input => {
            if (input.value) variables[input.dataset.variable] = input.value;
        });

        try {
            const response = await this.api.testPrompt({
                category: this.currentCategory,
                template_name: this.currentTemplate,
                variables: variables
            }, this.apiKey);
            this.ui.showTestResultsModal(response);
            this.ui.showStatus('Test complete.');
        } catch (error) {
            this.ui.showToast(`Test failed: ${error.message}`, 'error');
            this.ui.showStatus('Test failed.');
        }
    }
    
    async createBackup() {
        if (!this.currentCategory) {
            this.ui.showToast('Select a category to back up.', 'warning');
            return;
        }
        if (!confirm(`Are you sure you want to create a backup for the '${this.currentCategory}' category?`)) {
            return;
        }
        this.ui.showStatus('Creating backup...');
        try {
            await this.api.createBackup(this.currentCategory, this.apiKey);
            this.ui.showToast('Backup created successfully.', 'success');
            this.ui.showStatus('Backup complete.');
        } catch (error) {
            this.ui.showToast(`Backup failed: ${error.message}`, 'error');
            this.ui.showStatus('Backup failed.');
        }
    }

    updatePreview() {
        if (!this.currentTemplate || !this.editor) {
            this.ui.updatePreview('');
            return;
        }
        try {
            const categoryData = JSON.parse(this.editor.getValue());
            const template = categoryData.templates[this.currentTemplate];
            if (!template || !template.content) {
                this.ui.updatePreview('Template content not found in editor.', true);
                return;
            }
            
            let previewContent = template.content;
            this.ui.elements.variableInputs.querySelectorAll('.variable-input').forEach(input => {
                const varName = input.dataset.variable;
                const value = input.value || `{${varName}}`; // Show placeholder if empty
                previewContent = previewContent.replace(new RegExp(`{${varName}}`, 'g'), value);
            });
            this.ui.updatePreview(previewContent);
        } catch (error) {
            this.ui.updatePreview('Invalid JSON in editor...', true);
        }
    }
    
    formatEditor() {
        if (!this.editor || this.editor.getOption(monaco.editor.EditorOption.readOnly)) return;
        this.editor.getAction('editor.action.formatDocument').run();
        this.ui.showToast('Code formatted.', 'info');
    }

    addCustomVariable() {
        // 이 기능은 현재 구조에서 복잡성을 증가시킵니다.
        // 변수는 템플릿의 JSON 정의에서 파생되므로, UI에서 임의로 추가하는 것은
        // 데이터 모델과 동기화되지 않을 수 있습니다.
        // 가장 좋은 방법은 에디터에서 직접 'variables' 배열에 추가하는 것입니다.
        this.ui.showToast('To add a variable, please edit the "variables" array directly in the JSON editor.', 'info');
    }

    filterPrompts(term) {
        const lowerTerm = term.toLowerCase();
        document.querySelectorAll('[data-category]').forEach(categoryEl => {
            const categoryName = categoryEl.dataset.category.toLowerCase();
            let categoryMatch = categoryName.includes(lowerTerm);
            
            let hasVisibleTemplates = false;
            categoryEl.querySelectorAll('.template-item').forEach(templateEl => {
                const templateName = templateEl.dataset.template.toLowerCase();
                if (templateName.includes(lowerTerm)) {
                    templateEl.style.display = 'flex';
                    hasVisibleTemplates = true;
                } else {
                    templateEl.style.display = 'none';
                }
            });

            // 카테고리가 검색어와 일치하거나, 하위 템플릿 중 보이는 것이 있으면 카테고리 표시
            if (categoryMatch || hasVisibleTemplates) {
                categoryEl.style.display = 'block';
            } else {
                categoryEl.style.display = 'none';
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.promptStudio = new PromptStudio();
});