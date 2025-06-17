// Authentication module for Homework Management System

class Auth {
    static currentUser = null;

    // Initialize authentication
    static init() {
        // Check for existing session
        const userData = localStorage.getItem(CONFIG.APP.USER_STORAGE_KEY);
        const token = localStorage.getItem('auth_token');

        if (userData && token) {
            try {
                this.currentUser = JSON.parse(userData);
                api.setToken(token);
                console.log('Restored user session:', this.currentUser);
            } catch (error) {
                console.error('Error restoring session:', error);
                this.logout();
            }
        }
    }

    // Login user
    static async login(username, password, deviceName) {
        try {
            showAlert('Logging in...', 'info');
            
            const response = await api.login(username, password, deviceName);
            
            if (response.access_token && response.user) {
                this.currentUser = response.user;
                
                // Store user data
                localStorage.setItem(CONFIG.APP.USER_STORAGE_KEY, JSON.stringify(response.user));
                
                console.log('User logged in:', this.currentUser);
                
                // Show success message
                showAlert(`Welcome back, ${this.currentUser.fullname}!`, 'success');
                
                // Redirect to app
                this.showApp();
                
                return true;
            } else {
                throw new Error('Invalid login response');
            }
        } catch (error) {
            const message = ApiUtils.handleError(error);
            showAlert(message, 'danger');
            console.error('Login error:', error);
            return false;
        }
    }

    // Logout user
    static async logout() {
        try {
            // Call logout API if we have a token
            if (api.token) {
                await api.logout();
            }
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            // Clear local storage
            localStorage.removeItem(CONFIG.APP.USER_STORAGE_KEY);
            localStorage.removeItem('auth_token');
            
            // Clear API token
            api.setToken(null);
            
            // Clear current user
            this.currentUser = null;
            
            // Show login screen
            this.showLogin();
            
            console.log('User logged out');
        }
    }

    // Check if user is authenticated
    static isAuthenticated() {
        return this.currentUser !== null && api.token !== null;
    }

    // Get current user
    static getCurrentUser() {
        return this.currentUser;
    }

    // Get user role
    static getUserRole() {
        return this.currentUser ? this.currentUser.role : null;
    }

    // Check if user has specific role
    static hasRole(role) {
        return this.getUserRole() === role;
    }

    // Check if user is admin
    static isAdmin() {
        return this.hasRole('admin');
    }

    // Check if user is teacher
    static isTeacher() {
        return this.hasRole('teacher') || this.isAdmin();
    }

    // Check if user is student
    static isStudent() {
        return this.hasRole('student');
    }

    // Show login screen
    static showLogin() {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('appScreen').classList.add('hidden');
        document.getElementById('loginScreen').classList.remove('hidden');
    }

    // Show main app
    static showApp() {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appScreen').classList.remove('hidden');
        
        // Initialize app
        App.init();
    }

    // Show loading screen
    static showLoading() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appScreen').classList.add('hidden');
        document.getElementById('loadingScreen').classList.remove('hidden');
    }
}

// Login form handler
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const deviceName = document.getElementById('deviceName').value.trim() || CONFIG.APP.DEFAULT_DEVICE_NAME;
        
        if (!username || !password) {
            showAlert('Please fill in all required fields.', 'danger');
            return;
        }
        
        // Disable form during login
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        
        try {
            await Auth.login(username, password, deviceName);
        } finally {
            // Re-enable form
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// Demo login functions
function fillDemoLogin(type) {
    const demo = CONFIG.DEMO_ACCOUNTS[type];
    if (demo) {
        document.getElementById('username').value = demo.username;
        document.getElementById('password').value = demo.password;
        document.getElementById('deviceName').value = demo.deviceName;
    }
}

// Logout function (global)
function logout() {
    Auth.logout();
}

// Alert system
function showAlert(message, type = 'info', duration = 5000) {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    // Add icon based on type
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'danger':
            icon = '<i class="fas fa-exclamation-circle"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            break;
        case 'info':
            icon = '<i class="fas fa-info-circle"></i>';
            break;
    }
    
    alert.innerHTML = `${icon} ${message}`;
    
    // Insert alert
    const loginAlert = document.getElementById('loginAlert');
    if (loginAlert) {
        loginAlert.appendChild(alert);
    } else {
        // For app screens, insert at top of content
        const contentArea = document.getElementById('contentArea');
        if (contentArea) {
            contentArea.insertBefore(alert, contentArea.firstChild);
        }
    }
    
    // Auto-remove alert after duration
    if (duration > 0) {
        setTimeout(() => {
            if (alert && alert.parentNode) {
                alert.remove();
            }
        }, duration);
    }
}

// Session management
class SessionManager {
    static async checkSession() {
        try {
            const response = await api.getHealth();
            return response.status === 'healthy';
        } catch (error) {
            console.error('Session check failed:', error);
            return false;
        }
    }

    static async refreshSession() {
        if (!Auth.isAuthenticated()) {
            return false;
        }

        try {
            const isValid = await this.checkSession();
            if (!isValid) {
                showAlert('Your session has expired. Please login again.', 'warning');
                Auth.logout();
                return false;
            }
            return true;
        } catch (error) {
            console.error('Session refresh failed:', error);
            Auth.logout();
            return false;
        }
    }

    static startSessionCheck() {
        // Check session every 5 minutes
        setInterval(() => {
            this.refreshSession();
        }, 5 * 60 * 1000);
    }
}

// Initialize authentication when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Show loading screen initially
    Auth.showLoading();
    
    // Set up login form
    setupLoginForm();
    
    // Initialize auth
    Auth.init();
    
    // Check if user is already logged in
    setTimeout(() => {
        if (Auth.isAuthenticated()) {
            console.log('User already logged in, showing app');
            Auth.showApp();
        } else {
            console.log('No valid session, showing login');
            Auth.showLogin();
        }
    }, CONFIG.UI.LOADING_DELAY);
    
    // Start session monitoring
    SessionManager.startSessionCheck();
});

// Export Auth class globally
window.Auth = Auth;
window.SessionManager = SessionManager;
window.showAlert = showAlert;
window.fillDemoLogin = fillDemoLogin;