// API Client for Homework Management System - Enhanced with Force Login

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

    // Build complete URL - FIXED VERSION
    buildUrl(endpoint, params = {}) {
        // Don't add baseUrl if endpoint already starts with http
        if (endpoint.startsWith('http')) {
            return endpoint;
        }
        
        let url = endpoint;
        
        // Replace path parameters like {group_id}, {submission_id}
        for (const [key, value] of Object.entries(params)) {
            url = url.replace(`{${key}}`, value);
        }
        
        // Ensure endpoint starts with /
        if (!url.startsWith('/')) {
            url = '/' + url;
        }
        
        return this.baseUrl + url;
    }

    // Generic request method
    async request(method, endpoint, data = null, params = {}) {
        try {
            const url = this.buildUrl(endpoint, params);
            
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

            let responseData;
            try {
                responseData = await response.json();
            } catch (e) {
                if (response.ok) {
                    return { success: true };
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (!response.ok) {
                // For 409 conflicts, include the response data in the error
                if (response.status === 409) {
                    const error = new Error(responseData.detail || 'Maximum devices reached');
                    error.status = 409;
                    error.data = responseData;
                    throw error;
                }
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
        const data = await this.request('POST', '/auth/login', {
            username,
            password,
            device_name: deviceName
        });
        
        if (data.access_token) {
            this.setToken(data.access_token);
        }
        
        return data;
    }

    // Force login by kicking out a specific device
    async forceLogin(username, password, deviceName, sessionIdToRemove) {
        const data = await this.request('POST', '/auth/login/force', {
            username,
            password,
            device_name: deviceName,
            logout_session_id: sessionIdToRemove
        });
        
        if (data.access_token) {
            this.setToken(data.access_token);
        }
        
        return data;
    }

    async logout() {
        try {
            await this.request('POST', '/auth/logout');
        } finally {
            this.setToken(null);
        }
    }

    async getSessions() {
        return this.request('GET', '/auth/sessions');
    }

    async deleteSession(sessionId) {
        return this.request('DELETE', `/auth/sessions/${sessionId}`);
    }

    // System Methods
    async getHealth() {
        return this.request('GET', '/health');
    }

    async getStatus() {
        return this.request('GET', '/status');
    }

    async getConstants() {
        return this.request('GET', '/app/constants');
    }

    // Admin Methods
    async getTeachers() {
        return this.request('GET', '/admin/teachers');
    }

    async createTeacher(teacherData) {
        return this.request('POST', '/admin/teachers', teacherData);
    }

    async updateTeacher(teacherId, teacherData) {
        return this.request('PUT', `/admin/teachers/${teacherId}`, teacherData);
    }

    async deleteTeacher(teacherId) {
        return this.request('DELETE', `/admin/teachers/${teacherId}`);
    }

    async getStudents(groupId = null) {
        let endpoint = '/admin/students';
        if (groupId) {
            endpoint += `?group_id=${groupId}`;
        }
        return this.request('GET', endpoint);
    }

    async createStudent(studentData) {
        return this.request('POST', '/admin/students', studentData);
    }

    async updateStudent(studentId, studentData) {
        return this.request('PUT', `/admin/students/${studentId}`, studentData);
    }

    async deleteStudent(studentId) {
        return this.request('DELETE', `/admin/students/${studentId}`);
    }

    async getGroups() {
        return this.request('GET', '/admin/groups');
    }

    async createGroup(groupData) {
        return this.request('POST', '/admin/groups', groupData);
    }

    async updateGroup(groupId, groupData) {
        return this.request('PUT', `/admin/groups/${groupId}`, groupData);
    }

    async deleteGroup(groupId) {
        return this.request('DELETE', `/admin/groups/${groupId}`);
    }

    async getAdminLeaderboard(groupId, period = 'all') {
        return this.request('GET', `/admin/groups/${groupId}/leaderboard?period=${period}`);
    }

    // Teacher Methods
    async getTeacherHomework() {
        return this.request('GET', '/teacher/homework');
    }

    async createHomework(homeworkData) {
        return this.request('POST', '/teacher/homework', homeworkData);
    }

    async updateHomework(homeworkId, homeworkData) {
        return this.request('PUT', `/teacher/homework/${homeworkId}`, homeworkData);
    }

    async deleteHomework(homeworkId) {
        return this.request('DELETE', `/teacher/homework/${homeworkId}`);
    }

    async getTeacherGroups() {
        return this.request('GET', '/teacher/groups');
    }

    async getGroupSubmissions(groupId, homeworkId = null) {
        let endpoint = `/teacher/groups/${groupId}/submissions`;
        if (homeworkId) {
            endpoint += `?homework_id=${homeworkId}`;
        }
        return this.request('GET', endpoint);
    }

    async getTeacherLeaderboard(groupId, period = 'all') {
        return this.request('GET', `/teacher/groups/${groupId}/leaderboard?period=${period}`);
    }

    async updateGrade(submissionId, gradeData) {
        return this.request('PUT', `/teacher/submissions/${submissionId}/grade`, gradeData);
    }

    async getSubmissionGrade(submissionId) {
        return this.request('GET', `/teacher/submissions/${submissionId}/grade`);
    }

    // Student Methods
    async getStudentHomework() {
        return this.request('GET', '/student/homework');
    }

    async submitHomework(homeworkId, submissionData) {
        return this.request('POST', `/student/homework/${homeworkId}/submit`, submissionData);
    }

    async getStudentSubmissions(limit = 20) {
        return this.request('GET', `/student/submissions?limit=${limit}`);
    }

    async getStudentLeaderboard(period = 'all') {
        return this.request('GET', `/student/leaderboard?period=${period}`);
    }

    async getStudentSubmissionGrade(submissionId) {
        return this.request('GET', `/student/submissions/${submissionId}/grade`);
    }

    // Test Grading Methods
    async testGrading(testData) {
        return this.request('POST', '/test/test-grading', testData);
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
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch (e) {
            return dateString;
        }
    }

    static formatRelativeTime(dateString) {
        try {
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
        } catch (e) {
            return dateString;
        }
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