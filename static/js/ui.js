// ui.js

export const UIManager = {
    // 필요한 DOM 요소들을 가져옵니다.
    elements: {
        categoryList: document.getElementById('categoryList'),
        apiKeyModal: document.getElementById('apiKeyModal'),
        apiKeyInput: document.getElementById('apiKeyInput'),
        connectionStatus: document.getElementById('connectionStatus'),
        statusMessage: document.getElementById('statusMessage'),
        searchInput: document.getElementById('searchInput'),
        currentCategory: document.getElementById('currentCategory'),
        currentTemplate: document.getElementById('currentTemplate'),
        editorInfo: document.getElementById('editorInfo'),
        templateInfo: document.getElementById('templateInfo'),
        variableInputs: document.getElementById('variableInputs'),
        previewOutput: document.getElementById('previewOutput'),
        testResultsModal: document.getElementById('testResultsModal'),
        testResultsContainer: document.getElementById('testResults'),
        toastContainer: document.getElementById('toastContainer'),
        buttons: {
            save: document.getElementById('saveBtn'),
            test: document.getElementById('testBtn'),
            backup: document.getElementById('backupBtn'),
            format: document.getElementById('formatBtn'),
            closeTestModal: document.getElementById('closeTestModal'),
        }
    },

    /**
     * 카테고리 목록을 화면에 렌더링합니다.
     * @param {object} categories - 렌더링할 카테고리 데이터
     * @param {function} onTemplateClick - 템플릿 클릭 시 호출될 콜백 함수
     * @param {function} onCategoryToggle - 카테고리 토글 시 호출될 콜백 함수
     */
    renderCategoryList(categories, onTemplateClick, onCategoryToggle) {
        this.elements.categoryList.innerHTML = '';
        Object.entries(categories).forEach(([name, info]) => {
            const categoryElement = this.createCategoryElement(name, info, onTemplateClick, onCategoryToggle);
            this.elements.categoryList.appendChild(categoryElement);
        });
    },

    /**
     * 단일 카테고리 아코디언 아이템을 생성합니다.
     */
    createCategoryElement(categoryName, categoryInfo, onTemplateClick, onCategoryToggle) {
        const div = document.createElement('div');
        div.className = 'mb-4';
        div.dataset.category = categoryName;

        const headingId = `heading-${categoryName}`;
        const bodyId = `body-${categoryName}`;

        div.innerHTML = `
            <div data-accordion="collapse" data-active-classes="bg-blue-50 text-blue-600" data-inactive-classes="text-gray-500">
                <h2 id="${headingId}">
                    <button type="button" class="flex items-center justify-between w-full p-4 font-medium text-left text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100 focus:ring-4 focus:ring-gray-200" data-accordion-target="#${bodyId}" aria-expanded="false" aria-controls="${bodyId}">
                        <div class="flex items-center space-x-3">
                            <div class="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg"><svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg></div>
                            <div>
                                <div class="font-semibold text-gray-900">${categoryName}</div>
                                <div class="text-xs text-gray-500">${categoryInfo.description || 'No description'}</div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">${categoryInfo.template_count}</span>
                            <span class="text-xs text-gray-400">v${categoryInfo.version || '1.0.0'}</span>
                            <svg data-accordion-icon class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </div>
                    </button>
                </h2>
                <div id="${bodyId}" class="hidden" aria-labelledby="${headingId}">
                    <div class="p-4 border border-t-0 border-gray-200 rounded-b-lg bg-gray-50">
                        <div class="space-y-2">
                            ${categoryInfo.template_names.map(name => `
                                <div class="template-item flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 hover:border-blue-300" data-template="${name}" data-category="${categoryName}">
                                    <div class="flex items-center justify-center w-6 h-6 bg-green-100 rounded"><svg class="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg></div>
                                    <div class="flex-1">
                                        <div class="font-medium text-gray-900">${name}</div>
                                        <div class="text-xs text-gray-500">Click to edit template</div>
                                    </div>
                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Flowbite 아코디언은 data-accordion-target 속성을 통해 자체적으로 토글을 처리합니다.
        // 템플릿 아이템에 대한 클릭 이벤트 리스너만 추가합니다.
        div.querySelectorAll('.template-item').forEach(el => {
            el.addEventListener('click', (e) => {
                const templateName = e.currentTarget.dataset.template;
                const categoryName = e.currentTarget.dataset.category;
                onTemplateClick(categoryName, templateName);
            });
        });

        return div;
    },
    
    /**
     * API 키 입력 모달을 표시합니다.
     */
    showApiKeyModal() {
        this.elements.apiKeyModal.classList.remove('hidden');
        this.elements.apiKeyModal.classList.add('flex');
        this.elements.apiKeyInput.focus();
    },

    /**
     * API 키 입력 모달을 숨깁니다.
     */
    hideApiKeyModal() {
        this.elements.apiKeyModal.classList.add('hidden');
        this.elements.apiKeyModal.classList.remove('flex');
    },

    /**
     * API 연결 상태를 업데이트합니다.
     * @param {'connecting'|'connected'|'disconnected'} status - 연결 상태
     * @param {string} message - 표시할 메시지
     */
    updateConnectionStatus(status, message) {
        const statusConfig = {
            'connecting': { class: 'bg-yellow-600', icon: '🔄', text: 'text-white' },
            'connected': { class: 'bg-green-600', icon: '✅', text: 'text-white' },
            'disconnected': { class: 'bg-red-600', icon: '❌', text: 'text-white' }
        };
        const config = statusConfig[status];
        this.elements.connectionStatus.className = `px-2 py-1 text-xs rounded ${config.class} ${config.text}`;
        this.elements.connectionStatus.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-current mr-1"></span>${config.icon} ${message}`;
    },

    /**
     * 하단 상태 표시줄 메시지를 업데이트합니다.
     * @param {string} message - 표시할 메시지
     */
    showStatus(message) {
        this.elements.statusMessage.textContent = message;
    },

    /**
     * 토스트 메시지를 표시합니다.
     * @param {string} message - 토스트 메시지 내용
     * @param {'info'|'success'|'warning'|'error'} type - 토스트 타입
     */
    showToast(message, type = 'info') {
        const toastId = `toast_${Date.now()}`;
        const typeClasses = {
            'success': 'bg-green-500 text-white',
            'error': 'bg-red-500 text-white',
            'warning': 'bg-yellow-500 text-black',
            'info': 'bg-blue-500 text-white'
        };
        const icons = { 'success': '✅', 'error': '❌', 'warning': '⚠️', 'info': 'ℹ️' };

        const toastHtml = `
            <div id="${toastId}" class="p-4 rounded-lg shadow-lg ${typeClasses[type]} max-w-sm animate-pulse">
                <div class="flex items-center">
                    <span class="mr-2">${icons[type]}</span>
                    <span>${message}</span>
                </div>
            </div>`;
        this.elements.toastContainer.insertAdjacentHTML('beforeend', toastHtml);

        const toastElement = document.getElementById(toastId);
        setTimeout(() => toastElement.classList.remove('animate-pulse'), 100);
        setTimeout(() => toastElement.remove(), 5000);
    },

    /**
     * 템플릿 정보 패널을 업데이트합니다.
     * @param {object} template - 템플릿 객체
     */
    updateTemplateInfo(template) {
        this.elements.templateInfo.innerHTML = `
            <div><strong>Description:</strong> ${template.description || 'N/A'}</div>
            <div><strong>Model:</strong> ${template.model || 'N/A'}</div>
            <div><strong>Max Tokens:</strong> ${template.max_tokens || 'N/A'}</div>
            <div><strong>Variables:</strong> ${(template.variables || []).map(v => `<span class="bg-gray-200 text-gray-800 text-xs font-mono px-2 py-1 rounded">${v}</span>`).join(' ') || 'None'}</div>
        `;
    },

    /**
     * 변수 입력 필드를 업데이트합니다.
     * @param {string[]} variables - 변수 이름 배열
     */
    updateVariableInputs(variables) {
        if (!variables || variables.length === 0) {
            this.elements.variableInputs.innerHTML = '<div class="text-gray-500 text-sm">No variables detected for this template.</div>';
            return;
        }
        this.elements.variableInputs.innerHTML = variables.map(variable => `
            <div class="mb-2">
                <label for="var-${variable}" class="block text-sm font-medium text-gray-700">${variable}</label>
                <input type="text" id="var-${variable}" data-variable="${variable}" class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm variable-input">
            </div>
        `).join('');
    },
    
    /**
     * 테스트 결과를 모달에 표시합니다.
     * @param {object} response - 테스트 API 응답 객체
     */
    showTestResultsModal(response) {
        if (response.success) {
            this.elements.testResultsContainer.innerHTML = `
                <div class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4" role="alert"><p class="font-bold">✅ Test Successful</p></div>
                ${response.missing_variables && response.missing_variables.length > 0 ? `
                    <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
                        <p class="font-bold">⚠️ Missing Variables</p>
                        <p>The following variables were not provided: ${response.missing_variables.map(v => `<code>${v}</code>`).join(', ')}</p>
                    </div>
                ` : ''}
                <div class="mb-3">
                    <h3 class="font-semibold mb-2 text-gray-800">Rendered Prompt:</h3>
                    <pre class="bg-gray-100 p-3 border rounded max-h-96 overflow-y-auto text-sm">${response.rendered_prompt || 'No output'}</pre>
                </div>`;
        } else {
            this.elements.testResultsContainer.innerHTML = `
                <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
                    <p class="font-bold">❌ Test Failed</p>
                    <p>${response.error || 'An unknown error occurred.'}</p>
                </div>`;
        }
        this.elements.testResultsModal.classList.remove('hidden');
        this.elements.testResultsModal.classList.add('flex');
    },

    /**
     * 테스트 결과 모달을 숨깁니다.
     */
    hideTestResultsModal() {
        this.elements.testResultsModal.classList.add('hidden');
        this.elements.testResultsModal.classList.remove('flex');
    },

    /**
     * 현재 선택된 템플릿에 따라 UI를 업데이트합니다.
     * @param {string|null} category - 현재 카테고리 이름
     * @param {string|null} template - 현재 템플릿 이름
     * @param {boolean} hasUnsavedChanges - 저장되지 않은 변경 사항 여부
     */
    updateUI(category, template, hasUnsavedChanges) {
        const hasTemplate = category && template;
        
        this.elements.currentCategory.textContent = category || 'Select a Category';
        this.elements.currentTemplate.textContent = template || '';
        this.elements.editorInfo.textContent = hasTemplate ? `${category}.json` : 'No file selected';

        this.elements.buttons.save.disabled = !hasTemplate;
        this.elements.buttons.test.disabled = !hasTemplate;
        this.elements.buttons.backup.disabled = !category;
        this.elements.buttons.format.disabled = !hasTemplate;

        if (hasUnsavedChanges && !this.elements.buttons.save.disabled) {
            this.elements.buttons.save.innerHTML = `💾 Save *`;
            this.elements.buttons.save.classList.add('bg-yellow-500', 'hover:bg-yellow-600');
            this.elements.buttons.save.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        } else {
            this.elements.buttons.save.innerHTML = `💾 Save`;
            this.elements.buttons.save.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
            this.elements.buttons.save.classList.add('bg-blue-600', 'hover:bg-blue-700');
        }
    },
    
    /**
     * 미리보기 패널을 업데이트합니다.
     * @param {string} content - 표시할 내용
     * @param {boolean} isError - 에러 여부
     */
    updatePreview(content, isError = false) {
        this.elements.previewOutput.textContent = content;
        this.elements.previewOutput.classList.toggle('text-red-600', isError);
    },

    /**
     * 목록에서 활성 상태를 업데이트합니다.
     * @param {string} categoryName - 활성화할 카테고리 이름
     * @param {string} templateName - 활성화할 템플릿 이름
     */
    updateActiveStates(categoryName, templateName) {
        document.querySelectorAll('.template-item').forEach(el => {
            const isSelected = el.dataset.template === templateName && el.dataset.category === categoryName;
            el.classList.toggle('bg-blue-100', isSelected);
            el.classList.toggle('border-blue-500', isSelected);
            el.classList.toggle('shadow-md', isSelected);
        });
    }
};