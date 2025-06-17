// Enhanced API Client with Fixed Device Management Support

class ApiClient {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL;
        this.token = localStorage.getItem('auth_token');
        this.requestTimeout = 30000; // 30 seconds
        this.retryAttempts = 2;
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
            console.log('🔑 Authentication token set');
        } else {
            localStorage.removeItem('auth_token');
            console.log('🔑 Authentication token cleared');
        }
    }

    // Get authentication headers
    getHeaders(contentType = 'application/json') {
        const headers = {
            'Content-Type': contentType,
            'Accept': 'application/json',
            'X-Client-Version': CONFIG.APP.VERSION || '1.0.0',
            'X-Client-Type': 'web-frontend'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // Build complete URL
    buildUrl(endpoint, params = {}) {
        if (endpoint.startsWith('http')) {
            return endpoint;
        }
        
        let url = endpoint;
        
        // Replace path parameters like {group_id}, {submission_id}
        for (const [key, value] of Object.entries(params)) {
            url = url.replace(`{${key}}`, encodeURIComponent(value));
        }
        
        if (!url.startsWith('/')) {
            url = '/' + url;
        }
        
        return this.baseUrl + url;
    }

    // Enhanced request method
    async request(method, endpoint, data = null, params = {}) {
        let attempt = 0;
        let lastError;

        while (attempt <= this.retryAttempts) {
            try {
                const url = this.buildUrl(endpoint, params);
                
                const config = {
                    method: method.toUpperCase(),
                    headers: this.getHeaders(),
                    signal: AbortSignal.timeout(this.requestTimeout)
                };

                // Add request body for POST/PUT requests
                if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'put')) {
                    config.body = JSON.stringify(data);
                }

                console.log(`🌐 API Request [Attempt ${attempt + 1}]: ${method.toUpperCase()} ${url}`);
                
                const response = await fetch(url, config);
                
                // Handle different response scenarios
                if (response.status === 204) {
                    return { success: true, status: 204 };
                }

                // Parse response body
                let responseData;
                const contentType = response.headers.get('content-type');
                
                if (contentType && contentType.includes('application/json')) {
                    try {
                        responseData = await response.json();
                    } catch (parseError) {
                        console.warn('⚠️ Failed to parse JSON response:', parseError);
                        responseData = { message: 'Invalid JSON response' };
                    }
                } else {
                    const textContent = await response.text();
                    responseData = { message: textContent || 'No content' };
                }

                // Handle successful responses
                if (response.ok) {
                    console.log(`✅ API Success: ${method.toUpperCase()} ${endpoint}`);
                    return responseData;
                }

                // Enhanced handling for device conflicts (409)
                if (response.status === 409) {
                    console.log('📱 Device conflict detected:', responseData);
                    
                    // Create enhanced error with conflict data
                    const conflictError = new Error(responseData.detail?.message || responseData.message || 'Device limit exceeded');
                    conflictError.status = 409;
                    conflictError.data = responseData.detail || responseData;
                    conflictError.isDeviceConflict = true;
                    
                    throw conflictError;
                }

                // Handle authentication errors
                if (response.status === 401) {
                    console.warn('🔐 Authentication failed');
                    this.setToken(null);
                    
                    const authError = new Error('Authentication required. Please log in again.');
                    authError.status = 401;
                    authError.requiresLogin = true;
                    throw authError;
                }

                // Handle authorization errors
                if (response.status === 403) {
                    const forbiddenError = new Error(responseData.detail || 'Access denied. Insufficient permissions.');
                    forbiddenError.status = 403;
                    throw forbiddenError;
                }

                // Handle not found errors
                if (response.status === 404) {
                    const notFoundError = new Error(responseData.detail || 'Resource not found.');
                    notFoundError.status = 404;
                    throw notFoundError;
                }

                // Handle validation errors
                if (response.status === 422) {
                    let errorMessage = 'Validation failed.';
                    if (responseData.detail && Array.isArray(responseData.detail)) {
                        errorMessage = responseData.detail.map(err => err.msg || err.message || 'Validation error').join(', ');
                    } else if (responseData.detail) {
                        errorMessage = responseData.detail;
                    }
                    
                    const validationError = new Error(errorMessage);
                    validationError.status = 422;
                    validationError.validationDetails = responseData.detail;
                    throw validationError;
                }

                // Handle server errors
                if (response.status >= 500) {
                    const serverError = new Error(responseData.detail || 'Server error. Please try again later.');
                    serverError.status = response.status;
                    throw serverError;
                }

                // Handle other HTTP errors
                const httpError = new Error(responseData.detail || `HTTP error! status: ${response.status}`);
                httpError.status = response.status;
                throw httpError;

            } catch (error) {
                lastError = error;
                
                // Don't retry certain errors
                if (error.isDeviceConflict || error.status === 401 || error.status === 403 || error.status === 422) {
                    throw error;
                }

                // Handle network/timeout errors with retry
                if (error.name === 'AbortError') {
                    console.warn(`⏱️ Request timeout (attempt ${attempt + 1}/${this.retryAttempts + 1})`);
                } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                    console.warn(`🌐 Network error (attempt ${attempt + 1}/${this.retryAttempts + 1}):`, error.message);
                } else {
                    console.error(`❌ API Error (attempt ${attempt + 1}/${this.retryAttempts + 1}):`, error);
                }

                attempt++;
                
                // Wait before retry (exponential backoff)
                if (attempt <= this.retryAttempts) {
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`⏳ Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // All retries failed
        console.error('🚫 All retry attempts failed');
        throw lastError;
    }

    // Enhanced login with device conflict support
    async login(username, password, deviceName) {
        console.log(`🔐 Login attempt: ${username} on ${deviceName}`);
        
        const loginData = {
            username: username.trim(),
            password: password,
            device_name: deviceName
        };

        try {
            const response = await this.request('POST', '/auth/login', loginData);
            
            if (response.access_token) {
                this.setToken(response.access_token);
                console.log('✅ Login successful, token received');
            }
            
            return response;
        } catch (error) {
            console.error('🚫 Login failed:', error.message);
            throw error; // Re-throw to let calling code handle device conflicts
        }
    }

    // Enhanced force login with device fingerprint
    async forceLogin(username, password, deviceName, deviceFingerprint) {
        console.log(`🔄 Force login: ${username} on ${deviceName}, removing device ${deviceFingerprint}`);
        
        // Use query parameter for device fingerprint
        const endpoint = `/auth/login/force?device_fingerprint=${encodeURIComponent(deviceFingerprint)}`;
        
        const forceLoginData = {
            username: username.trim(),
            password: password,
            device_name: deviceName
        };

        try {
            const response = await this.request('POST', endpoint, forceLoginData);
            
            if (response.access_token) {
                this.setToken(response.access_token);
                console.log('✅ Force login successful, token received');
            }
            
            return response;
        } catch (error) {
            console.error('🚫 Force login failed:', error.message);
            throw error;
        }
    }

    // Enhanced logout with cleanup
    async logout() {
        try {
            console.log('👋 Logging out...');
            await this.request('POST', '/auth/logout');
            console.log('✅ Server logout successful');
        } catch (error) {
            console.warn('⚠️ Server logout failed, continuing with client cleanup:', error.message);
        } finally {
            this.setToken(null);
        }
    }

    // Get user sessions
    async getSessions() {
        console.log('📋 Fetching user sessions...');
        return this.request('GET', '/auth/sessions');
    }

    // Get user devices (new endpoint)
    async getDevices() {
        console.log('📱 Fetching user devices...');
        return this.request('GET', '/auth/devices');
    }

    // Delete specific session
    async deleteSession(sessionId) {
        console.log(`🗑️ Deleting session ${sessionId}...`);
        return this.request('DELETE', `/auth/sessions/${sessionId}`);
    }

    // Delete specific device (new endpoint)
    async deleteDevice(deviceFingerprint) {
        console.log(`🗑️ Deleting device ${deviceFingerprint}...`);
        return this.request('DELETE', `/auth/devices/${deviceFingerprint}`);
    }

    // Health check
    async getHealth() {
        try {
            const response = await this.request('GET', '/health');
            console.log('💚 Health check successful');
            return response;
        } catch (error) {
            console.error('💔 Health check failed:', error.message);
            throw error;
        }
    }

    // System status
    async getStatus() {
        return this.request('GET', '/status');
    }

    // Application constants
    async getConstants() {
        return this.request('GET', '/app/constants');
    }

    // Admin Methods
    async getTeachers() {
        console.log('👨‍🏫 Fetching teachers...');
        return this.request('GET', '/admin/teachers');
    }

    async createTeacher(teacherData) {
        console.log('👨‍🏫 Creating teacher:', teacherData.username);
        return this.request('POST', '/admin/teachers', teacherData);
    }

    async updateTeacher(teacherId, teacherData) {
        console.log(`👨‍🏫 Updating teacher ${teacherId}...`);
        return this.request('PUT', `/admin/teachers/${teacherId}`, teacherData);
    }

    async deleteTeacher(teacherId) {
        console.log(`👨‍🏫 Deleting teacher ${teacherId}...`);
        return this.request('DELETE', `/admin/teachers/${teacherId}`);
    }

    // Student management
    async getStudents(groupId = null) {
        console.log('👨‍🎓 Fetching students...');
        let endpoint = '/admin/students';
        if (groupId) {
            endpoint += `?group_id=${groupId}`;
        }
        return this.request('GET', endpoint);
    }

    async createStudent(studentData) {
        console.log('👨‍🎓 Creating student:', studentData.username);
        return this.request('POST', '/admin/students', studentData);
    }

    async updateStudent(studentId, studentData) {
        console.log(`👨‍🎓 Updating student ${studentId}...`);
        return this.request('PUT', `/admin/students/${studentId}`, studentData);
    }

    async deleteStudent(studentId) {
        console.log(`👨‍🎓 Deleting student ${studentId}...`);
        return this.request('DELETE', `/admin/students/${studentId}`);
    }

    // Group management
    async getGroups() {
        console.log('👥 Fetching groups...');
        return this.request('GET', '/admin/groups');
    }

    async createGroup(groupData) {
        console.log('👥 Creating group:', groupData.name);
        return this.request('POST', '/admin/groups', groupData);
    }

    async updateGroup(groupId, groupData) {
        console.log(`👥 Updating group ${groupId}...`);
        return this.request('PUT', `/admin/groups/${groupId}`, groupData);
    }

    async deleteGroup(groupId) {
        console.log(`👥 Deleting group ${groupId}...`);
        return this.request('DELETE', `/admin/groups/${groupId}`);
    }

    async getAdminLeaderboard(groupId, period = 'all') {
        console.log(`🏆 Fetching admin leaderboard for group ${groupId}...`);
        return this.request('GET', `/admin/groups/${groupId}/leaderboard?period=${period}`);
    }

    // Teacher Methods
    async getTeacherHomework() {
        console.log('📚 Fetching teacher homework...');
        return this.request('GET', '/teacher/homework');
    }

    async createHomework(homeworkData) {
        console.log('📚 Creating homework:', homeworkData.title);
        return this.request('POST', '/teacher/homework', homeworkData);
    }

    async updateHomework(homeworkId, homeworkData) {
        console.log(`📚 Updating homework ${homeworkId}...`);
        return this.request('PUT', `/teacher/homework/${homeworkId}`, homeworkData);
    }

    async deleteHomework(homeworkId) {
        console.log(`📚 Deleting homework ${homeworkId}...`);
        return this.request('DELETE', `/teacher/homework/${homeworkId}`);
    }

    async getTeacherGroups() {
        console.log('👥 Fetching teacher groups...');
        return this.request('GET', '/teacher/groups');
    }

    async getGroupSubmissions(groupId, homeworkId = null) {
        console.log(`📄 Fetching submissions for group ${groupId}...`);
        let endpoint = `/teacher/groups/${groupId}/submissions`;
        if (homeworkId) {
            endpoint += `?homework_id=${homeworkId}`;
        }
        return this.request('GET', endpoint);
    }

    async getTeacherLeaderboard(groupId, period = 'all') {
        console.log(`🏆 Fetching teacher leaderboard for group ${groupId}...`);
        return this.request('GET', `/teacher/groups/${groupId}/leaderboard?period=${period}`);
    }

    async updateGrade(submissionId, gradeData) {
        console.log(`📊 Updating grade for submission ${submissionId}...`);
        return this.request('PUT', `/teacher/submissions/${submissionId}/grade`, gradeData);
    }

    async getSubmissionGrade(submissionId) {
        console.log(`📊 Fetching grade for submission ${submissionId}...`);
        return this.request('GET', `/teacher/submissions/${submissionId}/grade`);
    }

    // Student Methods
    async getStudentHomework() {
        console.log('📚 Fetching student homework...');
        return this.request('GET', '/student/homework');
    }

    async submitHomework(homeworkId, submissionData) {
        console.log(`📤 Submitting homework ${homeworkId}...`);
        return this.request('POST', `/student/homework/${homeworkId}/submit`, submissionData);
    }

    async getStudentSubmissions(limit = 20) {
        console.log('📄 Fetching student submissions...');
        return this.request('GET', `/student/submissions?limit=${limit}`);
    }

    async getStudentLeaderboard(period = 'all') {
        console.log('🏆 Fetching student leaderboard...');
        return this.request('GET', `/student/leaderboard?period=${period}`);
    }

    async getStudentSubmissionGrade(submissionId) {
        console.log(`📊 Fetching grade for submission ${submissionId}...`);
        return this.request('GET', `/student/submissions/${submissionId}/grade`);
    }

    // Test Grading Methods
    async testGrading(testData) {
        console.log('🤖 Testing AI grading...');
        return this.request('POST', '/test/test-grading', testData);
    }
}

// Enhanced utility functions for API responses
class ApiUtils {
    // Enhanced error handling with user-friendly messages
    static handleError(error) {
        console.error('🚫 API Error:', error);
        
        // Handle authentication errors
        if (error.status === 401 || error.message.includes('401') || error.message.includes('Unauthorized')) {
            if (error.requiresLogin) {
                // Trigger automatic logout
                if (window.Auth) {
                    window.Auth.logout();
                }
            }
            return 'Your session has expired. Please log in again.';
        }
        
        // Handle authorization errors
        if (error.status === 403 || error.message.includes('403') || error.message.includes('Forbidden')) {
            return 'You do not have permission to perform this action.';
        }
        
        // Handle not found errors
        if (error.status === 404 || error.message.includes('404') || error.message.includes('Not Found')) {
            return 'The requested resource was not found.';
        }
        
        // Handle validation errors
        if (error.status === 422) {
            if (error.validationDetails && Array.isArray(error.validationDetails)) {
                return error.validationDetails.map(detail => detail.msg || detail.message || 'Validation error').join(', ');
            }
            return error.message || 'Invalid data provided. Please check your input.';
        }
        
        // Handle device conflicts
        if (error.isDeviceConflict || error.status === 409) {
            return error.message || 'Maximum devices reached. Please log out from one of your devices.';
        }
        
        // Handle server errors
        if (error.status >= 500 || error.message.includes('500') || error.message.includes('Internal Server Error')) {
            return 'Server error. Please try again later.';
        }
        
        // Handle network errors
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            return 'Network error. Please check your internet connection and try again.';
        }
        
        // Handle timeout errors
        if (error.name === 'AbortError') {
            return 'Request timed out. Please try again.';
        }
        
        // Default error message
        return error.message || 'An unexpected error occurred. Please try again.';
    }

    // Enhanced date formatting
    static formatDate(dateString) {
        try {
            const date = new Date(dateString);
            const options = {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            return date.toLocaleDateString(undefined, options);
        } catch (e) {
            return dateString;
        }
    }

    // Enhanced relative time formatting
    static formatRelativeTime(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffSecs < 60) return 'just now';
            if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
            if (diffDays < 30) {
                const weeks = Math.floor(diffDays / 7);
                return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
            }
            return this.formatDate(dateString);
        } catch (e) {
            return dateString;
        }
    }

    // Enhanced score color coding
    static getScoreColor(score) {
        if (score >= 95) return '#28a745'; // Excellent - Green
        if (score >= 85) return '#20c997'; // Very Good - Teal
        if (score >= 75) return '#ffc107'; // Good - Yellow
        if (score >= 65) return '#fd7e14'; // Fair - Orange
        if (score >= 50) return '#dc3545'; // Poor - Red
        return '#6c757d'; // Very Poor - Gray
    }

    // Enhanced score emoji
    static getScoreEmoji(score) {
        if (score >= 95) return '🎉'; // Excellent
        if (score >= 85) return '🚀'; // Very Good
        if (score >= 75) return '👍'; // Good
        if (score >= 65) return '👌'; // Fair
        if (score >= 50) return '📝'; // Poor
        return '💭'; // Very Poor
    }

    // Get score description
    static getScoreDescription(score) {
        if (score >= 95) return 'Excellent';
        if (score >= 85) return 'Very Good';
        if (score >= 75) return 'Good';
        if (score >= 65) return 'Fair';
        if (score >= 50) return 'Needs Improvement';
        return 'Poor';
    }
}

// Create global instances
window.api = new ApiClient();
window.ApiUtils = ApiUtils;

console.log('🌐 Enhanced API Client initialized with fixed device management support');