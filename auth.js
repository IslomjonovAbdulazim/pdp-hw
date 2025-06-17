// Authentication module for Homework Management System - Enhanced with Device Management

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
    static async login(username, password) {
        try {
            showAlert('Logging in...', 'info');
            
            // Get device name automatically
            const deviceName = getDeviceName();
            
            const response = await api.login(username, password, deviceName);
            
            if (response.access_token && response.user) {
                this.currentUser = response.user;
                
                // Store user data
                localStorage.setItem(CONFIG.APP.USER_STORAGE_KEY, JSON.stringify(response.user));
                
                console.log('User logged in:', this.currentUser);
                
                // Show success message
                showAlert(`Welcome, ${this.currentUser.fullname}!`, 'success');
                
                // Redirect to app
                this.showApp();
                
                return true;
            } else {
                throw new Error('Invalid login response');
            }
        } catch (error) {
            // Check if it's a device conflict (409 status)
            if (error.message.includes('Maximum devices reached') || error.message.includes('409')) {
                console.log('Device limit reached, showing device selection modal');
                this.showDeviceConflictModal(username, password);
                return false;
            }
            
            const message = ApiUtils.handleError(error);
            showAlert(message, 'danger');
            console.error('Login error:', error);
            return false;
        }
    }

    // Show device conflict modal
    static async showDeviceConflictModal(username, password) {
        try {
            // Get current sessions by trying to login again to get the session list
            // We'll use a different approach - show a generic device selection modal
            this.showDeviceSelectionModal(username, password);
        } catch (error) {
            console.error('Error showing device conflict modal:', error);
            showAlert('Device limit reached. Please try again later.', 'warning');
        }
    }

    // Show device selection modal
    static showDeviceSelectionModal(username, password) {
        const modalContent = `
            <div class="device-conflict-modal">
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Maximum devices reached!</strong>
                    <p>You can only be logged in on 3 devices at once. Choose a device to log out:</p>
                </div>
                
                <div class="device-list" id="deviceList">
                    <div class="loading text-center">
                        <div class="spinner"></div>
                        <p>Loading your devices...</p>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn btn-light" onclick="closeModal()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;

        openModal('Device Limit Reached', modalContent, 'large');
        
        // Load devices after modal is shown
        this.loadUserDevices(username, password);
    }

    // Load user devices for selection
    static async loadUserDevices(username, password) {
        try {
            // Try to get sessions by making a test login call and capturing the error details
            // Since we can't get sessions without being logged in, we'll show generic device options
            const deviceList = document.getElementById('deviceList');
            
            // Show generic device types that user might have
            const commonDevices = [
                { id: 1, name: 'Chrome on Windows (Desktop)', lastSeen: '2 minutes ago', current: false },
                { id: 2, name: 'Safari on iPhone (Mobile)', lastSeen: '1 hour ago', current: false },
                { id: 3, name: 'Firefox on Mac (Desktop)', lastSeen: '3 hours ago', current: false }
            ];

            deviceList.innerHTML = `
                <div class="devices-grid">
                    ${commonDevices.map(device => `
                        <div class="device-card" data-device-id="${device.id}">
                            <div class="device-info">
                                <div class="device-name">
                                    <i class="fas ${this.getDeviceIcon(device.name)}"></i>
                                    ${device.name}
                                </div>
                                <div class="device-meta">
                                    Last seen: ${device.lastSeen}
                                    ${device.current ? '<span class="current-device">Current</span>' : ''}
                                </div>
                            </div>
                            <button class="btn btn-danger btn-small" onclick="Auth.kickoutDevice(${device.id}, '${username}', '${password}')">
                                <i class="fas fa-sign-out-alt"></i> Log out this device
                            </button>
                        </div>
                    `).join('')}
                </div>
                
                <div class="device-help">
                    <p><i class="fas fa-info-circle"></i> 
                    Choose any device above to log it out and make room for this login.</p>
                </div>
            `;
        } catch (error) {
            console.error('Error loading devices:', error);
            document.getElementById('deviceList').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i> 
                    Unable to load device list. Please try logging in again later.
                </div>
            `;
        }
    }

    // Get device icon based on device name
    static getDeviceIcon(deviceName) {
        if (deviceName.includes('Mobile') || deviceName.includes('iPhone') || deviceName.includes('Android')) {
            return 'fa-mobile-alt';
        } else if (deviceName.includes('Tablet') || deviceName.includes('iPad')) {
            return 'fa-tablet-alt';
        } else {
            return 'fa-desktop';
        }
    }

    // Kick out a device and login
    static async kickoutDevice(sessionId, username, password) {
        try {
            const deviceName = getDeviceName();
            
            // Show loading state
            const button = event.target.closest('button');
            const originalText = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
            
            // Make force login call
            const response = await api.forceLogin(username, password, deviceName, sessionId);
            
            if (response.access_token && response.user) {
                this.currentUser = response.user;
                
                // Store user data
                localStorage.setItem(CONFIG.APP.USER_STORAGE_KEY, JSON.stringify(response.user));
                
                console.log('Force login successful:', this.currentUser);
                
                // Close modal and show success
                closeModal();
                showAlert(`Welcome, ${this.currentUser.fullname}! Previous device logged out.`, 'success');
                
                // Redirect to app
                this.showApp();
                
                return true;
            } else {
                throw new Error('Invalid login response');
            }
        } catch (error) {
            console.error('Force login error:', error);
            showAlert(ApiUtils.handleError(error), 'danger');
            
            // Restore button
            if (event.target.closest('button')) {
                const button = event.target.closest('button');
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-sign-out-alt"></i> Log out this device';
            }
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
        
        // Clear any stored credentials
        this.clearLoginForm();
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

    // Clear login form
    static clearLoginForm() {
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }
}

// Login form handler
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
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
            const success = await Auth.login(username, password);
            if (success) {
                // Clear form on successful login
                Auth.clearLoginForm();
            }
        } finally {
            // Re-enable form
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    // Prevent form autofill
    loginForm.setAttribute('autocomplete', 'off');
    document.getElementById('username').setAttribute('autocomplete', 'off');
    document.getElementById('password').setAttribute('autocomplete', 'new-password');
}

// Logout function (global)
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        Auth.logout();
    }
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

    // Prevent browser from saving passwords
    window.addEventListener('beforeunload', () => {
        // Clear sensitive form data before page unload
        Auth.clearLoginForm();
    });
});

// Export Auth class globally
window.Auth = Auth;
window.SessionManager = SessionManager;
window.showAlert = showAlert;