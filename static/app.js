/**
 * Prompt Studio - Main Application
 * Web-based prompt management interface
 */

class PromptStudio {
    constructor() {
        this.apiKey = null;
        this.editor = null;
        this.currentCategory = null;
        this.currentTemplate = null;
        this.categories = {};
        this.unsavedChanges = false;
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Prompt Studio...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check for stored API key
        this.apiKey = localStorage.getItem('prompt_studio_api_key');
        
        if (!this.apiKey) {
            this.showApiKeyModal();
        } else {
            await this.connectToAPI();
        }
    }

    setupEventListeners() {
        // API Key modal
        document.getElementById('saveApiKeyBtn').addEventListener('click', () => {
            this.saveApiKey();
        });

        // Main buttons
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveCurrentPrompt();
        });

        document.getElementById('testBtn').addEventListener('click', () => {
            this.testCurrentPrompt();
        });

        document.getElementById('backupBtn').addEventListener('click', () => {
            this.createBackup();
        });

        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadCategories();
        });

        document.getElementById('formatBtn').addEventListener('click', () => {
            this.formatEditor();
        });

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterPrompts(e.target.value);
        });

        // Add variable button
        document.getElementById('addVariableBtn').addEventListener('click', () => {
            this.addCustomVariable();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 's') {
                    e.preventDefault();
                    this.saveCurrentPrompt();
                } else if (e.key === 't') {
                    e.preventDefault();
                    this.testCurrentPrompt();
                }
            }
        });

        // Window beforeunload
        window.addEventListener('beforeunload', (e) => {
            if (this.unsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    showApiKeyModal() {
        const modal = document.getElementById('apiKeyModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Focus on input
        document.getElementById('apiKeyInput').focus();
        
        // Handle Enter key
        document.getElementById('apiKeyInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveApiKey();
            }
        });
    }

    saveApiKey() {
        const apiKey = document.getElementById('apiKeyInput').value.trim();
        
        if (!apiKey) {
            this.showToast('Please enter an API key', 'error');
            return;
        }

        this.apiKey = apiKey;
        localStorage.setItem('prompt_studio_api_key', apiKey);
        
        // Hide modal
        const modal = document.getElementById('apiKeyModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        
        this.connectToAPI();
    }

    async connectToAPI() {
        this.updateConnectionStatus('connecting', 'Connecting...');
        
        try {
            const response = await this.apiRequest('/api/prompts');
            
            if (response.success) {
                this.updateConnectionStatus('connected', 'Connected');
                await this.loadCategories();
                this.setupMonacoEditor();
            } else {
                throw new Error('Invalid API response');
            }
        } catch (error) {
            console.error('Connection failed:', error);
            this.updateConnectionStatus('disconnected', 'Connection failed');
            this.showToast('Failed to connect to API. Please check your API key.', 'error');
            this.showApiKeyModal();
        }
    }

    updateConnectionStatus(status, message) {
        const statusElement = document.getElementById('connectionStatus');
        const statusConfig = {
            'connecting': { class: 'bg-yellow-600', icon: '🔄', text: 'text-white' },
            'connected': { class: 'bg-green-600', icon: '✅', text: 'text-white' },
            'disconnected': { class: 'bg-red-600', icon: '❌', text: 'text-white' }
        };

        const config = statusConfig[status];
        statusElement.className = `px-2 py-1 text-xs rounded ${config.class} ${config.text}`;
        statusElement.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-current mr-1"></span>${config.icon} ${message}`;
    }

    async setupMonacoEditor() {
        require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.34.0/min/vs' } });
        
        require(['vs/editor/editor.main'], () => {
            this.editor = monaco.editor.create(document.getElementById('editorContainer'), {
                value: '',
                language: 'json',
                theme: 'vs-light',
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                formatOnPaste: true,
                formatOnType: true
            });

            // Setup editor change listener
            this.editor.onDidChangeModelContent(() => {
                this.onEditorChange();
            });

            console.log('✅ Monaco Editor initialized');
        });
    }

    async loadCategories() {
        try {
            this.showStatus('Loading categories...');
            
            const response = await this.apiRequest('/api/prompts');
            
            if (response.success) {
                this.categories = response.categories;
                this.renderCategoryList();
                this.showStatus(`Loaded ${response.total_categories} categories with ${response.total_templates} templates`);
            } else {
                throw new Error('Failed to load categories');
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
            this.showToast('Failed to load categories', 'error');
            this.showStatus('Error loading categories');
        }
    }

    renderCategoryList() {
        const container = document.getElementById('categoryList');
        container.innerHTML = '';

        Object.entries(this.categories).forEach(([categoryName, categoryInfo]) => {
            const categoryElement = this.createCategoryElement(categoryName, categoryInfo);
            container.appendChild(categoryElement);
        });
    }

    createCategoryElement(categoryName, categoryInfo) {
        const div = document.createElement('div');
        div.className = 'category-item';
        div.dataset.category = categoryName;

        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="fw-semibold">${categoryName}</div>
                    <div class="template-meta">${categoryInfo.description || 'No description'}</div>
                </div>
                <span class="template-count">${categoryInfo.template_count}</span>
            </div>
            <div class="template-list mt-2" style="display: none;">
                ${categoryInfo.template_names.map(name => `
                    <div class="template-item" data-template="${name}">
                        <i class="bi bi-file-text"></i> ${name}
                    </div>
                `).join('')}
            </div>
        `;

        // Category click handler
        div.addEventListener('click', (e) => {
            if (e.target.closest('.template-item')) return;
            this.toggleCategory(div, categoryName);
        });

        // Template click handlers
        div.querySelectorAll('.template-item').forEach(templateEl => {
            templateEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const templateName = templateEl.dataset.template;
                this.loadTemplate(categoryName, templateName);
            });
        });

        return div;
    }

    toggleCategory(categoryElement, categoryName) {
        const templateList = categoryElement.querySelector('.template-list');
        const isExpanded = templateList.style.display !== 'none';

        // Collapse all other categories
        document.querySelectorAll('.category-item').forEach(el => {
            el.classList.remove('active');
            el.querySelector('.template-list').style.display = 'none';
        });

        if (!isExpanded) {
            categoryElement.classList.add('active');
            templateList.style.display = 'block';
        }
    }

    async loadTemplate(categoryName, templateName) {
        if (this.unsavedChanges) {
            if (!confirm('You have unsaved changes. Continue without saving?')) {
                return;
            }
        }

        try {
            this.showStatus(`Loading ${categoryName}.${templateName}...`);
            
            const response = await this.apiRequest(`/api/prompts/${categoryName}`);
            
            if (response.success) {
                const category = response.category;
                const template = category.templates[templateName];
                
                if (!template) {
                    throw new Error(`Template ${templateName} not found`);
                }

                this.currentCategory = categoryName;
                this.currentTemplate = templateName;
                
                this.loadTemplateIntoEditor(category, template);
                this.updateTemplateInfo(template);
                this.updateVariableInputs(template.variables || []);
                this.updateUI();
                
                // Update active states
                this.updateActiveStates(categoryName, templateName);
                
                this.showStatus(`Loaded ${categoryName}.${templateName}`);
                this.unsavedChanges = false;
            } else {
                throw new Error('Failed to load template');
            }
        } catch (error) {
            console.error('Failed to load template:', error);
            this.showToast(`Failed to load ${categoryName}.${templateName}`, 'error');
        }
    }

    loadTemplateIntoEditor(category, template) {
        const fullCategory = {
            version: category.version,
            category: category.category,
            description: category.description,
            templates: category.templates
        };

        const editorContent = JSON.stringify(fullCategory, null, 2);
        
        if (this.editor) {
            this.editor.setValue(editorContent);
            this.editor.setPosition({ lineNumber: 1, column: 1 });
        }
    }

    updateTemplateInfo(template) {
        const container = document.getElementById('templateInfo');
        
        container.innerHTML = `
            <div class="info-item">
                <span class="info-label">Description:</span><br>
                <span class="info-value">${template.description || 'No description'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Model:</span><br>
                <span class="info-value">${template.model || 'Not specified'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Max Tokens:</span><br>
                <span class="info-value">${template.max_tokens || 'Not specified'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Variables:</span><br>
                <div class="mt-1">
                    ${(template.variables || []).map(v => `<span class="badge badge-variable">${v}</span>`).join(' ') || '<span class="text-muted">None</span>'}
                </div>
            </div>
        `;
    }

    updateVariableInputs(variables) {
        const container = document.getElementById('variableInputs');
        
        if (!variables || variables.length === 0) {
            container.innerHTML = '<div class="text-muted small">No variables detected</div>';
            return;
        }

        container.innerHTML = variables.map(variable => `
            <div class="variable-input-group">
                <div class="input-group input-group-sm">
                    <span class="input-group-text">${variable}</span>
                    <input type="text" class="form-control variable-input" 
                           data-variable="${variable}" placeholder="Enter value...">
                </div>
            </div>
        `).join('');

        // Add event listeners for real-time preview
        container.querySelectorAll('.variable-input').forEach(input => {
            input.addEventListener('input', () => {
                this.updatePreview();
            });
        });
    }

    updateActiveStates(categoryName, templateName) {
        // Update category active state
        document.querySelectorAll('.category-item').forEach(el => {
            el.classList.remove('active');
            if (el.dataset.category === categoryName) {
                el.classList.add('active');
                el.querySelector('.template-list').style.display = 'block';
            }
        });

        // Update template active state
        document.querySelectorAll('.template-item').forEach(el => {
            el.classList.remove('active');
            if (el.dataset.template === templateName && 
                el.closest('.category-item').dataset.category === categoryName) {
                el.classList.add('active');
            }
        });
    }

    updateUI() {
        const hasTemplate = this.currentCategory && this.currentTemplate;
        
        // Update header
        document.getElementById('currentCategory').textContent = 
            hasTemplate ? this.currentCategory : 'Select a category';
        document.getElementById('currentTemplate').textContent = 
            hasTemplate ? this.currentTemplate : '';
        
        // Update editor info
        document.getElementById('editorInfo').textContent = 
            hasTemplate ? `${this.currentCategory}.json` : 'No file selected';
        
        // Enable/disable buttons
        document.getElementById('saveBtn').disabled = !hasTemplate;
        document.getElementById('testBtn').disabled = !hasTemplate;
        document.getElementById('backupBtn').disabled = !hasTemplate;
        document.getElementById('formatBtn').disabled = !hasTemplate;
    }

    onEditorChange() {
        this.unsavedChanges = true;
        this.updatePreview();
        
        // Update save button state
        const saveBtn = document.getElementById('saveBtn');
        if (!saveBtn.disabled) {
            saveBtn.innerHTML = '<i class="bi bi-save"></i> Save *';
            saveBtn.classList.remove('btn-success');
            saveBtn.classList.add('btn-warning');
        }
    }

    async updatePreview() {
        if (!this.currentCategory || !this.currentTemplate || !this.editor) {
            return;
        }

        try {
            // Get current editor content
            const editorContent = this.editor.getValue();
            const categoryData = JSON.parse(editorContent);
            
            // Get the current template
            const template = categoryData.templates[this.currentTemplate];
            if (!template) {
                this.showPreview('Template not found in current data', true);
                return;
            }

            // Collect variable values
            const variables = {};
            document.querySelectorAll('.variable-input').forEach(input => {
                const varName = input.dataset.variable;
                const value = input.value.trim();
                if (value) {
                    variables[varName] = value;
                }
            });

            // Simple template substitution for preview
            let preview = template.content;
            Object.entries(variables).forEach(([key, value]) => {
                const regex = new RegExp(`\\${key}\\b`, 'g');
                preview = preview.replace(regex, value);
            });

            this.showPreview(preview, false);

        } catch (error) {
            this.showPreview(`Preview error: ${error.message}`, true);
        }
    }

    showPreview(content, isError = false) {
        const container = document.getElementById('previewOutput');
        container.textContent = content;
        
        if (isError) {
            container.style.color = '#dc3545';
            container.style.fontStyle = 'italic';
        } else {
            container.style.color = '';
            container.style.fontStyle = '';
        }
    }

    async saveCurrentPrompt() {
        if (!this.currentCategory || !this.editor) {
            this.showToast('No prompt selected to save', 'warning');
            return;
        }

        try {
            this.showStatus('Saving...');
            
            const editorContent = this.editor.getValue();
            const categoryData = JSON.parse(editorContent);
            
            const response = await this.apiRequest(`/api/prompts/${this.currentCategory}`, {
                method: 'PUT',
                body: JSON.stringify({ data: categoryData })
            });

            if (response.success) {
                this.unsavedChanges = false;
                this.showToast('Prompt saved successfully', 'success');
                this.showStatus(`Saved ${this.currentCategory}.${this.currentTemplate}`);
                
                // Reset save button
                const saveBtn = document.getElementById('saveBtn');
                saveBtn.innerHTML = '<i class="bi bi-save"></i> Save';
                saveBtn.classList.remove('btn-warning');
                saveBtn.classList.add('btn-success');
                
                // Reload categories to get updated info
                await this.loadCategories();
                
            } else {
                throw new Error(response.message || 'Save failed');
            }

        } catch (error) {
            console.error('Save failed:', error);
            this.showToast(`Save failed: ${error.message}`, 'error');
            this.showStatus('Save failed');
        }
    }

    async testCurrentPrompt() {
        if (!this.currentCategory || !this.currentTemplate) {
            this.showToast('No prompt selected to test', 'warning');
            return;
        }

        try {
            this.showStatus('Testing prompt...');
            
            // Collect variables
            const variables = {};
            document.querySelectorAll('.variable-input').forEach(input => {
                const varName = input.dataset.variable;
                const value = input.value.trim();
                if (value) {
                    variables[varName] = value;
                }
            });

            const response = await this.apiRequest('/api/prompts/test', {
                method: 'POST',
                body: JSON.stringify({
                    category: this.currentCategory,
                    template_name: this.currentTemplate,
                    variables: variables
                })
            });

            this.showTestResults(response);
            this.showStatus('Test completed');

        } catch (error) {
            console.error('Test failed:', error);
            this.showToast(`Test failed: ${error.message}`, 'error');
            this.showStatus('Test failed');
        }
    }

    showTestResults(response) {
        const modal = document.getElementById('testResultsModal');
        const container = document.getElementById('testResults');
        
        if (response.success) {
            container.innerHTML = `
                <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    <h3 class="font-semibold">✅ Test Successful</h3>
                </div>
                
                ${response.missing_variables && response.missing_variables.length > 0 ? `
                    <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                        <h3 class="font-semibold">⚠️ Missing Variables</h3>
                        <p>The following variables were not provided:</p>
                        <ul class="list-disc list-inside">
                            ${response.missing_variables.map(v => `<li><code class="bg-gray-200 px-1 rounded">${v}</code></li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <div class="mb-3">
                    <h3 class="font-semibold mb-2">Rendered Output:</h3>
                    <pre class="bg-gray-100 p-3 border rounded max-h-96 overflow-y-auto">${response.rendered_prompt || 'No output'}</pre>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <h3 class="font-semibold">❌ Test Failed</h3>
                    <p>${response.error || 'Unknown error occurred'}</p>
                </div>
            `;
        }
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Close modal handler
        document.getElementById('closeTestModal').onclick = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };
        
        // Click outside to close
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        };
    }

    async createBackup() {
        if (!this.currentCategory) {
            this.showToast('No category selected for backup', 'warning');
            return;
        }

        try {
            this.showStatus('Creating backup...');
            
            const response = await this.apiRequest(`/api/admin/backup/${this.currentCategory}`, {
                method: 'POST'
            });

            if (response.success) {
                this.showToast('Backup created successfully', 'success');
                this.showStatus('Backup created');
            } else {
                throw new Error(response.message || 'Backup failed');
            }

        } catch (error) {
            console.error('Backup failed:', error);
            this.showToast(`Backup failed: ${error.message}`, 'error');
            this.showStatus('Backup failed');
        }
    }

    formatEditor() {
        if (!this.editor) return;
        
        try {
            const content = this.editor.getValue();
            const formatted = JSON.stringify(JSON.parse(content), null, 2);
            this.editor.setValue(formatted);
            this.showToast('Code formatted', 'success');
        } catch (error) {
            this.showToast('Invalid JSON format', 'error');
        }
    }

    addCustomVariable() {
        const variableName = prompt('Enter variable name:');
        if (!variableName) return;
        
        const container = document.getElementById('variableInputs');
        
        // Check if variable already exists
        if (container.querySelector(`[data-variable="${variableName}"]`)) {
            this.showToast('Variable already exists', 'warning');
            return;
        }
        
        // Remove "no variables" message if present
        const noVarsMsg = container.querySelector('.text-muted');
        if (noVarsMsg) {
            noVarsMsg.remove();
        }
        
        // Add new variable input
        const newVarDiv = document.createElement('div');
        newVarDiv.className = 'variable-input-group';
        newVarDiv.innerHTML = `
            <div class="input-group input-group-sm">
                <span class="input-group-text">${variableName}</span>
                <input type="text" class="form-control variable-input" 
                       data-variable="${variableName}" placeholder="Enter value...">
                <button class="btn btn-outline-danger btn-sm" type="button" onclick="this.closest('.variable-input-group').remove()">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `;
        
        container.appendChild(newVarDiv);
        
        // Add event listener for preview update
        newVarDiv.querySelector('.variable-input').addEventListener('input', () => {
            this.updatePreview();
        });
    }

    filterPrompts(searchTerm) {
        const categories = document.querySelectorAll('.category-item');
        const term = searchTerm.toLowerCase();
        
        categories.forEach(categoryEl => {
            const categoryName = categoryEl.dataset.category.toLowerCase();
            const templates = categoryEl.querySelectorAll('.template-item');
            
            let categoryMatch = categoryName.includes(term);
            let hasVisibleTemplates = false;
            
            templates.forEach(templateEl => {
                const templateName = templateEl.dataset.template.toLowerCase();
                const templateMatch = templateName.includes(term);
                
                if (templateMatch || (term === '' && categoryMatch)) {
                    templateEl.style.display = 'block';
                    hasVisibleTemplates = true;
                } else {
                    templateEl.style.display = 'none';
                }
            });
            
            if (categoryMatch || hasVisibleTemplates || term === '') {
                categoryEl.style.display = 'block';
            } else {
                categoryEl.style.display = 'none';
            }
        });
    }

    async apiRequest(endpoint, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            }
        };

        const finalOptions = { ...defaultOptions, ...options };
        
        const response = await fetch(endpoint, finalOptions);
        
        if (!response.ok) {
            if (response.status === 401) {
                this.showToast('Invalid API key', 'error');
                this.showApiKeyModal();
                throw new Error('Unauthorized');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toastId = 'toast_' + Date.now();
        
        const typeClasses = {
            'success': 'bg-green-500 text-white',
            'error': 'bg-red-500 text-white',
            'warning': 'bg-yellow-500 text-black',
            'info': 'bg-blue-500 text-white'
        };
        
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        
        const toastHtml = `
            <div id="${toastId}" class="p-4 rounded-lg shadow-lg ${typeClasses[type]} max-w-sm">
                <div class="flex items-center">
                    <span class="mr-2">${icons[type]}</span>
                    <span>${message}</span>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', toastHtml);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            const toastElement = document.getElementById(toastId);
            if (toastElement) {
                toastElement.remove();
            }
        }, 5000);
    }

    getToastIcon(type) {
        const icons = {
            'success': 'bi-check-circle',
            'error': 'bi-x-circle',
            'warning': 'bi-exclamation-triangle',
            'info': 'bi-info-circle'
        };
        return icons[type] || icons.info;
    }

    showStatus(message) {
        document.getElementById('statusMessage').textContent = message;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.promptStudio = new PromptStudio();
});