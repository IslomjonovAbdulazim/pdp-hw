// Configuration file for the Homework Management Web App

const CONFIG = {
    // API Configuration
    API_BASE_URL: 'http://localhost:8000',
    
    // API Endpoints
    ENDPOINTS: {
        // Authentication
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        SESSIONS: '/auth/sessions',
        
        // Health & System
        HEALTH: '/health',
        STATUS: '/status',
        CONSTANTS: '/app/constants',
        
        // Admin Endpoints
        ADMIN: {
            TEACHERS: '/admin/teachers',
            STUDENTS: '/admin/students',
            GROUPS: '/admin/groups',
            LEADERBOARD: '/admin/groups/{group_id}/leaderboard'
        },
        
        // Teacher Endpoints
        TEACHER: {
            HOMEWORK: '/teacher/homework',
            GROUPS: '/teacher/groups',
            SUBMISSIONS: '/teacher/groups/{group_id}/submissions',
            LEADERBOARD: '/teacher/groups/{group_id}/leaderboard',
            GRADE: '/teacher/submissions/{submission_id}/grade'
        },
        
        // Student Endpoints
        STUDENT: {
            HOMEWORK: '/student/homework',
            SUBMISSIONS: '/student/submissions',
            SUBMIT: '/student/homework/{homework_id}/submit',
            LEADERBOARD: '/student/leaderboard',
            GRADE: '/student/submissions/{submission_id}/grade'
        },
        
        // Testing
        TEST_GRADING: '/test/test-grading'
    },
    
    // Application Settings
    APP: {
        NAME: 'Homework Management System',
        VERSION: '1.0.0',
        SESSION_STORAGE_KEY: 'homework_session',
        USER_STORAGE_KEY: 'homework_user'
    },
    
    // UI Settings
    UI: {
        LOADING_DELAY: 1000, // Minimum loading screen time
        TOAST_DURATION: 5000,
        MODAL_ANIMATION_DURATION: 300
    },
    
    // File Extensions and Languages
    LANGUAGES: {
        '.py': 'Python',
        '.js': 'JavaScript',
        '.java': 'Java',
        '.cpp': 'C++',
        '.c': 'C',
        '.ts': 'TypeScript',
        '.go': 'Go',
        '.rs': 'Rust',
        '.dart': 'Dart',
        '.kt': 'Kotlin',
        '.swift': 'Swift'
    }
};

// Utility function to get device name automatically
function getDeviceName() {
    const userAgent = navigator.userAgent;
    let deviceName = 'Unknown Device';
    
    // Detect browser
    let browser = 'Unknown Browser';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';
    
    // Detect OS
    let os = 'Unknown OS';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';
    
    // Detect device type
    let deviceType = 'Desktop';
    if (/Mobi|Android/i.test(userAgent)) deviceType = 'Mobile';
    else if (/Tablet|iPad/i.test(userAgent)) deviceType = 'Tablet';
    
    deviceName = `${browser} on ${os} (${deviceType})`;
    
    return deviceName;
}

// Utility function to get full API URL
function getApiUrl(endpoint, params = {}) {
    let url = CONFIG.API_BASE_URL + endpoint;
    
    // Replace path parameters
    for (const [key, value] of Object.entries(params)) {
        url = url.replace(`{${key}}`, value);
    }
    
    return url;
}

// Export configuration for use in other modules
window.CONFIG = CONFIG;
window.getApiUrl = getApiUrl;
window.getDeviceName = getDeviceName;