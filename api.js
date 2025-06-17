// API Client for Homework Management System

class ApiClient {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL;
        this.token = localStorage.getItem('auth_token');
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    }

    // Get authentication headers
    getHeaders(contentType = 'application/json') {
        const headers = {
            'Content-Type': contentType
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // Generic request method
    async request(method, endpoint, data = null, params = {}) {
        try {
            const url = getApiUrl(endpoint, params);
            
            const config = {
                method: method.toUpperCase(),
                headers: this.getHeaders(),
            };

            if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'put')) {
                config.body = JSON.stringify(data);
            }

            console.log(`API Request: ${method.toUpperCase()} ${url}`);
            
            const response = await fetch(url, config);
            
            // Handle different response types
            if (response.status === 204) {
                return { success: true };
            }

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.detail || `HTTP error! status: ${response.status}`);
            }

            return responseData;
        } catch (error) {
            console.error(`API Error: ${method.toUpperCase()} ${endpoint}`, error);
            throw error;
        }
    }

    // Authentication Methods
    async login(username, password, deviceName) {
        const data = await this.request('POST', CONFIG.ENDPOINTS.LOGIN, {
            username,
            password,
            device_name: deviceName
        });
        
        if (data.access_token) {
            this.setToken(data.access_token);
        }
        
        return data;
    }

    async logout() {
        try {
            await this.request('POST', CONFIG.ENDPOINTS.LOGOUT);
        } finally {
            this.setToken(null);
        }
    }

    async getSessions() {
        return this.request('GET', CONFIG.ENDPOINTS.SESSIONS);
    }

    async deleteSession(sessionId) {
        return this.request('DELETE', `${CONFIG.ENDPOINTS.SESSIONS}/${sessionId}`);
    }

    // System Methods
    async getHealth() {
        return this.request('GET', CONFIG.ENDPOINTS.HEALTH);
    }

    async getStatus() {
        return this.request('GET', CONFIG.ENDPOINTS.STATUS);
    }

    async getConstants() {
        return this.request('GET', CONFIG.ENDPOINTS.CONSTANTS);
    }

    // Admin Methods
    async getTeachers() {
        return this.request('GET', CONFIG.ENDPOINTS.ADMIN.TEACHERS);
    }

    async createTeacher(teacherData) {
        return this.request('POST', CONFIG.ENDPOINTS.ADMIN.TEACHERS, teacherData);
    }

    async updateTeacher(teacherId, teacherData) {
        return this.request('PUT', `${CONFIG.ENDPOINTS.ADMIN.TEACHERS}/${teacherId}`, teacherData);
    }

    async deleteTeacher(teacherId) {
        return this.request('DELETE', `${CONFIG.ENDPOINTS.ADMIN.TEACHERS}/${teacherId}`);
    }

    async getStudents(groupId = null) {
        let endpoint = CONFIG.ENDPOINTS.ADMIN.STUDENTS;
        if (groupId) {
            endpoint += `?group_id=${groupId}`;
        }
        return this.request('GET', endpoint);
    }

    async createStudent(studentData) {
        return this.request('POST', CONFIG.ENDPOINTS.ADMIN.STUDENTS, studentData);
    }

    async updateStudent(studentId, studentData) {
        return this.request('PUT', `${CONFIG.ENDPOINTS.ADMIN.STUDENTS}/${studentId}`, studentData);
    }

    async deleteStudent(studentId) {
        return this.request('DELETE', `${CONFIG.ENDPOINTS.ADMIN.STUDENTS}/${studentId}`);
    }

    async getGroups() {
        return this.request('GET', CONFIG.ENDPOINTS.ADMIN.GROUPS);
    }

    async createGroup(groupData) {
        return this.request('POST', CONFIG.ENDPOINTS.ADMIN.GROUPS, groupData);
    }

    async updateGroup(groupId, groupData) {
        return this.request('PUT', `${CONFIG.ENDPOINTS.ADMIN.GROUPS}/${groupId}`, groupData);
    }

    async deleteGroup(groupId) {
        return this.request('DELETE', `${CONFIG.ENDPOINTS.ADMIN.GROUPS}/${groupId}`);
    }

    async getAdminLeaderboard(groupId, period = 'all') {
        return this.request('GET', CONFIG.ENDPOINTS.ADMIN.LEADERBOARD, null, { group_id: groupId }) + `?period=${period}`;
    }

    // Teacher Methods
    async getTeacherHomework() {
        return this.request('GET', CONFIG.ENDPOINTS.TEACHER.HOMEWORK);
    }

    async createHomework(homeworkData) {
        return this.request('POST', CONFIG.ENDPOINTS.TEACHER.HOMEWORK, homeworkData);
    }

    async updateHomework(homeworkId, homeworkData) {
        return this.request('PUT', `${CONFIG.ENDPOINTS.TEACHER.HOMEWORK}/${homeworkId}`, homeworkData);
    }

    async deleteHomework(homeworkId) {
        return this.request('DELETE', `${CONFIG.ENDPOINTS.TEACHER.HOMEWORK}/${homeworkId}`);
    }

    async getTeacherGroups() {
        return this.request('GET', CONFIG.ENDPOINTS.TEACHER.GROUPS);
    }

    async getGroupSubmissions(groupId, homeworkId = null) {
        let endpoint = CONFIG.ENDPOINTS.TEACHER.SUBMISSIONS.replace('{group_id}', groupId);
        if (homeworkId) {
            endpoint += `?homework_id=${homeworkId}`;
        }
        return this.request('GET', endpoint);
    }

    async getTeacherLeaderboard(groupId, period = 'all') {
        const endpoint = CONFIG.ENDPOINTS.TEACHER.LEADERBOARD.replace('{group_id}', groupId) + `?period=${period}`;
        return this.request('GET', endpoint);
    }

    async updateGrade(submissionId, gradeData) {
        return this.request('PUT', CONFIG.ENDPOINTS.TEACHER.GRADE, gradeData, { submission_id: submissionId });
    }

    async getSubmissionGrade(submissionId) {
        return this.request('GET', CONFIG.ENDPOINTS.TEACHER.GRADE, null, { submission_id: submissionId });
    }

    // Student Methods
    async getStudentHomework() {
        return this.request('GET', CONFIG.ENDPOINTS.STUDENT.HOMEWORK);
    }

    async submitHomework(homeworkId, submissionData) {
        return this.request('POST', CONFIG.ENDPOINTS.STUDENT.SUBMIT, submissionData, { homework_id: homeworkId });
    }

    async getStudentSubmissions(limit = 20) {
        return this.request('GET', `${CONFIG.ENDPOINTS.STUDENT.SUBMISSIONS}?limit=${limit}`);
    }

    async getStudentLeaderboard(period = 'all') {
        return this.request('GET', `${CONFIG.ENDPOINTS.STUDENT.LEADERBOARD}?period=${period}`);
    }

    async getStudentSubmissionGrade(submissionId) {
        return this.request('GET', CONFIG.ENDPOINTS.STUDENT.GRADE, null, { submission_id: submissionId });
    }

    // Test Grading Methods
    async testGrading(testData) {
        return this.request('POST', CONFIG.ENDPOINTS.TEST_GRADING, testData);
    }
}

// Utility functions for API responses
class ApiUtils {
    static handleError(error) {
        console.error('API Error:', error);
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            // Redirect to login
            Auth.logout();
            return 'Session expired. Please login again.';
        }
        
        if (error.message.includes('403') || error.message.includes('Forbidden')) {
            return 'You do not have permission to perform this action.';
        }
        
        if (error.message.includes('404') || error.message.includes('Not Found')) {
            return 'The requested resource was not found.';
        }
        
        if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
            return 'Server error. Please try again later.';
        }
        
        return error.message || 'An unexpected error occurred.';
    }

    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    static formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        return this.formatDate(dateString);
    }

    static getScoreColor(score) {
        if (score >= 90) return '#28a745'; // Green
        if (score >= 80) return '#ffc107'; // Yellow
        if (score >= 70) return '#fd7e14'; // Orange
        return '#dc3545'; // Red
    }

    static getScoreEmoji(score) {
        if (score >= 90) return '🎉';
        if (score >= 80) return '👍';
        if (score >= 70) return '👌';
        return '📝';
    }
}

// Create global instances
window.api = new ApiClient();
window.ApiUtils = ApiUtils;