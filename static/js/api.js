// api.js

export const ApiService = {
  /**
   * API 요청을 보내는 범용 래퍼 함수
   * @param {string} endpoint - 요청할 API 엔드포인트
   * @param {string} apiKey - 인증을 위한 API 키
   * @param {object} options - fetch 요청에 대한 추가 옵션
   * @returns {Promise<object>} - 파싱된 JSON 응답
   */
  async request(endpoint, apiKey, options = {}) {
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    };

    const finalOptions = { ...defaultOptions, ...options, headers: {...defaultOptions.headers, ...options.headers} };

    const response = await fetch(endpoint, finalOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
    }
    
    return await response.json();
  },

  /**
   * 모든 프롬프트 카테고리를 가져옵니다.
   * @param {string} apiKey - API 키
   */
  async getCategories(apiKey) {
    return this.request('/api/prompts', apiKey);
  },

  /**
   * 특정 카테고리의 데이터를 가져옵니다.
   * @param {string} categoryName - 카테고리 이름
   * @param {string} apiKey - API 키
   */
  async getCategory(categoryName, apiKey) {
    return this.request(`/api/prompts/${categoryName}`, apiKey);
  },

  /**
   * 카테고리 데이터를 업데이트합니다.
   * @param {string} categoryName - 업데이트할 카테고리 이름
   * @param {object} data - 업데이트할 카테고리 데이터
   * @param {string} apiKey - API 키
   */
  async updateCategory(categoryName, data, apiKey) {
    return this.request(`/api/prompts/${categoryName}`, apiKey, {
      method: 'PUT',
      body: JSON.stringify({ data })
    });
  },

  /**
   * 프롬프트 템플릿을 테스트합니다.
   * @param {object} payload - 테스트 데이터 ({ category, template_name, variables })
   * @param {string} apiKey - API 키
   */
  async testPrompt(payload, apiKey) {
    return this.request('/api/prompts/test', apiKey, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  
  /**
   * 특정 카테고리의 백업을 생성합니다.
   * @param {string} categoryName - 백업할 카테고리 이름
   * @param {string} apiKey - API 키
   */
  async createBackup(categoryName, apiKey) {
    return this.request(`/api/admin/backup/${categoryName}`, apiKey, {
      method: 'POST'
    });
  }
};