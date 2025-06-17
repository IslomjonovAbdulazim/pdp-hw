// Fixed Configuration file with error handling and debugging

console.log('🔧 Loading configuration...');

const CONFIG = {
    // API Configuration - Updated for better reliability
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
    
    // UI Settings - Reduced loading delay to fix stuck loading
    UI: {
        LOADING_DELAY: 500, // Reduced from 1000ms to 500ms
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

// Enhanced device name detection with error handling
function getDeviceName() {
    try {
        const userAgent = navigator.userAgent;
        let deviceName = 'Unknown Device';
        
        // Detect browser
        let browser = 'Unknown Browser';
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
            browser = 'Chrome';
        } else if (userAgent.includes('Firefox')) {
            browser = 'Firefox';
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            browser = 'Safari';
        } else if (userAgent.includes('Edg')) {
            browser = 'Edge';
        } else if (userAgent.includes('Opera')) {
            browser = 'Opera';
        }
        
        // Detect OS
        let os = 'Unknown OS';
        if (userAgent.includes('Windows')) {
            os = 'Windows';
        } else if (userAgent.includes('Mac')) {
            os = 'macOS';
        } else if (userAgent.includes('Linux')) {
            os = 'Linux';
        } else if (userAgent.includes('Android')) {
            os = 'Android';
        } else if (userAgent.includes('iOS')) {
            os = 'iOS';
        }
        
        // Detect device type
        let deviceType = 'Desktop';
        if (/Mobi|Android/i.test(userAgent)) {
            deviceType = 'Mobile';
        } else if (/Tablet|iPad/i.test(userAgent)) {
            deviceType = 'Tablet';
        }
        
        deviceName = `${browser} on ${os} (${deviceType})`;
        
        console.log('📱 Device detected:', deviceName);
        return deviceName;
    } catch (error) {
        console.error('❌ Error detecting device:', error);
        return 'Unknown Device';
    }
}

// Enhanced URL builder with error handling
function getApiUrl(endpoint, params = {}) {
    try {
        let url = CONFIG.API_BASE_URL + endpoint;
        
        // Replace path parameters
        for (const [key, value] of Object.entries(params)) {
            url = url.replace(`{${key}}`, encodeURIComponent(value));
        }
        
        return url;
    } catch (error) {
        console.error('❌ Error building API URL:', error);
        return CONFIG.API_BASE_URL + endpoint; // Fallback
    }
}

// Configuration validation
function validateConfiguration() {
    console.log('🔍 Validating configuration...');
    
    const issues = [];
    
    // Check API base URL
    if (!CONFIG.API_BASE_URL) {
        issues.push('API_BASE_URL is not configured');
    } else if (!CONFIG.API_BASE_URL.startsWith('http')) {
        issues.push('API_BASE_URL should start with http:// or https://');
    } else {
        console.log('✅ API Base URL:', CONFIG.API_BASE_URL);
    }
    
    // Check required app settings
    if (!CONFIG.APP.NAME) {
        issues.push('APP.NAME is not configured');
    }
    
    if (!CONFIG.APP.USER_STORAGE_KEY) {
        issues.push('APP.USER_STORAGE_KEY is not configured');
    }
    
    // Check UI settings
    if (!CONFIG.UI.LOADING_DELAY || CONFIG.UI.LOADING_DELAY < 0) {
        console.warn('⚠️ Invalid LOADING_DELAY, using default');
        CONFIG.UI.LOADING_DELAY = 500;
    }
    
    // Report issues
    if (issues.length > 0) {
        console.error('❌ Configuration issues found:', issues);
        throw new Error(`Configuration errors: ${issues.join(', ')}`);
    } else {
        console.log('✅ Configuration validation passed');
    }
    
    return true;
}

// Test API connectivity
async function testApiConnectivity() {
    try {
        console.log('🌐 Testing API connectivity...');
        
        const testUrl = CONFIG.API_BASE_URL + '/health';
        console.log('📡 Testing URL:', testUrl);
        
        // Use a short timeout for the test
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(testUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            console.log('✅ API connectivity test passed');
            return true;
        } else {
            console.warn('⚠️ API responded with status:', response.status);
            return false;
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('⚠️ API connectivity test timed out');
        } else {
            console.warn('⚠️ API connectivity test failed:', error.message);
        }
        return false;
    }
}

// Initialize configuration
function initializeConfig() {
    try {
        console.log('🚀 Initializing configuration...');
        
        // Validate configuration
        validateConfiguration();
        
        // Test API connectivity in background (don't block UI)
        testApiConnectivity().then(connected => {
            if (connected) {
                console.log('🌐 API server is reachable');
            } else {
                console.warn('⚠️ API server may be unreachable - check if the backend is running on ' + CONFIG.API_BASE_URL);
                
                // Show a non-blocking warning to user
                setTimeout(() => {
                    if (window.showAlert) {
                        showAlert('⚠️ Cannot connect to server. Please ensure the backend is running on ' + CONFIG.API_BASE_URL, 'warning', 10000);
                    }
                }, 2000);
            }
        }).catch(error => {
            console.error('❌ Error testing API connectivity:', error);
        });
        
        console.log('✅ Configuration initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Configuration initialization failed:', error);
        
        // Show error to user
        if (window.showAlert) {
            showAlert('Configuration error: ' + error.message, 'danger');
        } else {
            alert('Configuration error: ' + error.message);
        }
        
        return false;
    }
}

// Export configuration for use in other modules
window.CONFIG = CONFIG;
window.getApiUrl = getApiUrl;
window.getDeviceName = getDeviceName;
window.validateConfiguration = validateConfiguration;
window.testApiConnectivity = testApiConnectivity;

// Initialize on load
try {
    initializeConfig();
    console.log('🔧 Configuration module loaded successfully');
} catch (error) {
    console.error('❌ Critical error loading configuration:', error);
}