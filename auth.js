// Fixed Authentication module with comprehensive error handling and debugging

class Auth {
    static currentUser = null;
    static deviceConflictData = null;
    static initializationComplete = false;

    // Initialize authentication with enhanced error handling
    static init() {
        console.log('🔄 Starting authentication initialization...');
        
        try {
            // Check for existing session with validation
            const userData = localStorage.getItem(CONFIG.APP.USER_STORAGE_KEY);
            const token = localStorage.getItem('auth_token');

            console.log('🔍 Checking stored session data:', { 
                hasUserData: !!userData, 
                hasToken: !!token 
            });

            if (userData && token) {
                try {
                    this.currentUser = JSON.parse(userData);
                    api.setToken(token);
                    console.log('✅ Restored user session:', this.currentUser);
                    
                    // Validate session in background (don't block UI)
                    this.validateStoredSession().catch(error => {
                        console.warn('⚠️ Background session validation failed:', error);
                    });
                } catch (parseError) {
                    console.error('❌ Error parsing stored session data:', parseError);
                    this.clearStoredSession();
                }
            } else {
                console.log('ℹ️ No stored session found');
            }

            this.initializationComplete = true;
            console.log('✅ Authentication initialization complete');
        } catch (error) {
            console.error('❌ Critical error during authentication initialization:', error);
            this.initializationComplete = true; // Prevent infinite loading
            this.clearStoredSession();
        }
    }

    // Clear stored session data
    static clearStoredSession() {
        try {
            localStorage.removeItem(CONFIG.APP.USER_STORAGE_KEY);
            localStorage.removeItem('auth_token');
            this.currentUser = null;
            if (window.api) {
                api.setToken(null);
            }
            console.log('🧹 Cleared stored session data');
        } catch (error) {
            console.error('❌ Error clearing session:', error);
        }
    }

    // Validate that stored session is still active (background task)
    static async validateStoredSession() {
        try {
            console.log('🔍 Validating stored session...');
            await api.getHealth();
            console.log('✅ Session validation successful');
            return true;
        } catch (error) {
            console.warn('⚠️ Stored session invalid, will logout on next action:', error);
            // Don't immediately logout - wait for user action to avoid disrupting UX
            return false;
        }
    }

    // Enhanced login with comprehensive device management
    static async login(username, password) {
        console.log(`🔐 Login attempt for: ${username}`);
        
        try {
            showAlert('🔐 Authenticating credentials...', 'info');
            
            // Get device name automatically with enhanced detection
            const deviceName = this.getEnhancedDeviceName();
            console.log(`📱 Device: ${deviceName}`);
            
            const response = await api.login(username, password, deviceName);
            
            if (response.access_token && response.user) {
                this.currentUser = response.user;
                
                // Store user data with enhanced metadata
                const sessionData = {
                    ...response.user,
                    loginTime: new Date().toISOString(),
                    deviceName: deviceName,
                    sessionId: response.session_info?.session_id
                };
                
                localStorage.setItem(CONFIG.APP.USER_STORAGE_KEY, JSON.stringify(sessionData));
                
                console.log('✅ User logged in successfully:', this.currentUser);
                
                // Show personalized welcome message
                const timeOfDay = this.getTimeOfDay();
                showAlert(`🎉 ${timeOfDay}, ${this.currentUser.fullname}! Welcome back.`, 'success');
                
                // Redirect to app
                this.showApp();
                
                return true;
            } else {
                throw new Error('Invalid login response structure');
            }
        } catch (error) {
            console.error('🚫 Login error:', error);
            
            // Enhanced error handling for device conflicts
            if (error.status === 409 || error.message.includes('Maximum devices reached')) {
                console.log('📱 Device limit reached, handling conflict...');
                
                // Parse the detailed conflict response
                if (error.data && error.data.active_sessions) {
                    this.deviceConflictData = {
                        username,
                        password,
                        conflictInfo: error.data
                    };
                    
                    this.showRealDeviceConflictModal();
                    return false;
                } else {
                    // Fallback for older API responses
                    this.showGenericDeviceConflictModal(username, password);
                    return false;
                }
            }
            
            // Handle other login errors
            const message = ApiUtils.handleError(error);
            showAlert(`🚫 Login failed: ${message}`, 'danger');
            return false;
        }
    }

    // Show device conflict modal with real session data
    static showRealDeviceConflictModal() {
        const data = this.deviceConflictData;
        const conflictInfo = data.conflictInfo;
        
        console.log('📋 Showing device conflict modal with real data:', conflictInfo);
        
        const modalContent = `
            <div class="device-conflict-modal">
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Device Limit Reached!</strong>
                    <p>${conflictInfo.message}</p>
                    <p class="device-limit-info">
                        <strong>${conflictInfo.current_devices}/${conflictInfo.max_devices}</strong> devices are currently logged in as <strong>${conflictInfo.username}</strong>
                    </p>
                </div>
                
                <div class="help-text">
                    <i class="fas fa-info-circle"></i>
                    ${conflictInfo.help_text}
                </div>
                
                <div class="devices-container">
                    <h4>📱 Your Active Devices</h4>
                    <div class="devices-grid" id="realDevicesList">
                        ${this.renderActiveDevices(conflictInfo.active_sessions)}
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn btn-light" onclick="Auth.cancelDeviceConflict()">
                        <i class="fas fa-times"></i> Cancel Login
                    </button>
                    <button type="button" class="btn btn-info" onclick="Auth.refreshDeviceList()">
                        <i class="fas fa-sync"></i> Refresh List
                    </button>
                </div>
            </div>
        `;

        openModal('🔐 Device Management Required', modalContent, 'large');
    }

    // Show generic device conflict modal as fallback
    static showGenericDeviceConflictModal(username, password) {
        console.log('📋 Showing generic device conflict modal');
        
        const modalContent = `
            <div class="device-conflict-modal">
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Maximum devices reached!</strong>
                    <p>You can only be logged in on 3 devices at once. Please log out from one of your other devices and try again.</p>
                </div>
                
                <div class="help-text">
                    <i class="fas fa-info-circle"></i>
                    To continue, please log out from one of your other devices (phone, tablet, other computers) and try logging in again.
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn btn-light" onclick="Auth.cancelDeviceConflict()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button type="button" class="btn btn-primary" onclick="Auth.retryLogin('${username}', '${password}')">
                        <i class="fas fa-retry"></i> Try Again
                    </button>
                </div>
            </div>
        `;

        openModal('🔐 Device Limit Reached', modalContent);
    }

    // Retry login after user presumably logged out from another device
    static async retryLogin(username, password) {
        closeModal();
        return await this.login(username, password);
    }

    // Render active devices with enhanced information
    static renderActiveDevices(sessions) {
        if (!sessions || sessions.length === 0) {
            return '<p class="text-center text-muted">No active sessions found.</p>';
        }

        return sessions.map(session => {
            const deviceIcon = this.getDeviceIcon(session.device_type, session.browser);
            const statusClass = session.is_suspicious ? 'device-suspicious' : 'device-normal';
            const timeAgo = this.getTimeAgo(session.last_login);
            const location = session.location !== 'Unknown' ? session.location : session.ip_address;
            
            return `
                <div class="device-card ${statusClass}" data-session-id="${session.id}">
                    <div class="device-header">
                        <div class="device-icon">
                            ${deviceIcon}
                        </div>
                        <div class="device-info">
                            <div class="device-name">${session.device_name}</div>
                            <div class="device-meta">
                                <span class="device-type">${session.device_type}</span>
                                <span class="device-browser">${session.browser}</span>
                                <span class="device-os">${session.operating_system || 'Unknown OS'}</span>
                            </div>
                        </div>
                        ${session.is_suspicious ? '<div class="suspicious-badge">⚠️ Suspicious</div>' : ''}
                    </div>
                    
                    <div class="device-details">
                        <div class="detail-row">
                            <span class="detail-label">📍 Location:</span>
                            <span class="detail-value">${location}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">🕒 Last Active:</span>
                            <span class="detail-value">${timeAgo}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">⏰ Expires:</span>
                            <span class="detail-value">${this.getTimeAgo(session.expires_at)}</span>
                        </div>
                    </div>
                    
                    <div class="device-actions">
                        <button class="btn btn-danger btn-full device-action" 
                                onclick="Auth.forceLoginByTerminating(${session.id})"
                                data-session-id="${session.id}">
                            <i class="fas fa-sign-out-alt"></i> 
                            Log out this device & continue
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Force login by terminating specific session
    static async forceLoginByTerminating(sessionId) {
        if (!this.deviceConflictData) {
            showAlert('🚫 Session data not available. Please try logging in again.', 'danger');
            return;
        }

        const data = this.deviceConflictData;
        
        try {
            // Show loading state on the specific button
            const button = document.querySelector(`[data-session-id="${sessionId}"]`);
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out device...';
            }

            console.log(`🔄 Force login: terminating session ${sessionId} for ${data.username}`);
            
            showAlert('🔄 Terminating selected device and logging you in...', 'info');
            
            // Get enhanced device name for new session
            const deviceName = this.getEnhancedDeviceName();
            
            // Make force login API call with proper parameters
            const response = await api.forceLogin(data.username, data.password, deviceName, sessionId);
            
            if (response.access_token && response.user) {
                this.currentUser = response.user;
                
                // Store enhanced session data
                const sessionData = {
                    ...response.user,
                    loginTime: new Date().toISOString(),
                    deviceName: deviceName,
                    sessionId: response.session_info?.session_id,
                    forcedLogin: true,
                    terminatedSession: sessionId
                };
                
                localStorage.setItem(CONFIG.APP.USER_STORAGE_KEY, JSON.stringify(sessionData));
                
                console.log('✅ Force login successful:', this.currentUser);
                
                // Clear conflict data
                this.deviceConflictData = null;
                
                // Close modal and show success
                closeModal();
                showAlert(`🎉 Welcome back, ${this.currentUser.fullname}! Previous device has been logged out.`, 'success');
                
                // Redirect to app
                this.showApp();
                
                return true;
            } else {
                throw new Error('Invalid force login response');
            }
        } catch (error) {
            console.error('🚫 Force login error:', error);
            showAlert(`🚫 Force login failed: ${ApiUtils.handleError(error)}`, 'danger');
            
            // Restore button state
            const button = document.querySelector(`[data-session-id="${sessionId}"]`);
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-sign-out-alt"></i> Log out this device & continue';
            }
            
            return false;
        }
    }

    // Enhanced device name detection
    static getEnhancedDeviceName() {
        try {
            const userAgent = navigator.userAgent;
            
            // Detect browser with version
            let browser = 'Unknown Browser';
            if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
                const match = userAgent.match(/Chrome\/(\d+)/);
                browser = match ? `Chrome ${match[1]}` : 'Chrome';
            } else if (userAgent.includes('Firefox')) {
                const match = userAgent.match(/Firefox\/(\d+)/);
                browser = match ? `Firefox ${match[1]}` : 'Firefox';
            } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
                browser = 'Safari';
            } else if (userAgent.includes('Edg')) {
                browser = 'Edge';
            } else if (userAgent.includes('Opera')) {
                browser = 'Opera';
            }
            
            // Detect OS with more detail
            let os = 'Unknown OS';
            if (userAgent.includes('Windows NT 10.0')) os = 'Windows 10';
            else if (userAgent.includes('Windows NT 6.3')) os = 'Windows 8.1';
            else if (userAgent.includes('Windows NT 6.1')) os = 'Windows 7';
            else if (userAgent.includes('Windows')) os = 'Windows';
            else if (userAgent.includes('Mac OS X')) {
                const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
                os = match ? `macOS ${match[1].replace('_', '.')}` : 'macOS';
            }
            else if (userAgent.includes('Linux')) os = 'Linux';
            else if (userAgent.includes('Android')) {
                const match = userAgent.match(/Android (\d+)/);
                os = match ? `Android ${match[1]}` : 'Android';
            }
            else if (userAgent.includes('iOS')) os = 'iOS';
            
            // Detect device type
            let deviceType = 'Desktop';
            if (/Mobi|Android/i.test(userAgent)) deviceType = 'Mobile';
            else if (/Tablet|iPad/i.test(userAgent)) deviceType = 'Tablet';
            
            return `${browser} on ${os} (${deviceType})`;
        } catch (error) {
            console.error('❌ Error detecting device name:', error);
            return 'Unknown Device';
        }
    }

    // Get device icon based on type and browser
    static getDeviceIcon(deviceType, browser) {
        let deviceIcon = '💻'; // Desktop default
        let browserIcon = '🌐'; // Browser default
        
        try {
            // Device type icons
            switch (deviceType?.toLowerCase()) {
                case 'mobile':
                    deviceIcon = '📱';
                    break;
                case 'tablet':
                    deviceIcon = '📱';
                    break;
                case 'desktop':
                default:
                    deviceIcon = '💻';
                    break;
            }
            
            // Browser icons
            switch (browser?.toLowerCase()) {
                case 'chrome':
                    browserIcon = '🔴';
                    break;
                case 'firefox':
                    browserIcon = '🦊';
                    break;
                case 'safari':
                    browserIcon = '🧭';
                    break;
                case 'edge':
                    browserIcon = '🔵';
                    break;
                default:
                    browserIcon = '🌐';
                    break;
            }
        } catch (error) {
            console.error('❌ Error getting device icon:', error);
        }
        
        return `<span class="device-icon-combo">${deviceIcon}${browserIcon}</span>`;
    }

    // Cancel device conflict and return to login
    static cancelDeviceConflict() {
        this.deviceConflictData = null;
        closeModal();
        showAlert('Login cancelled. You can try again or log out from one of your devices manually.', 'info');
    }

    // Enhanced logout with session cleanup
    static async logout() {
        try {
            console.log('👋 Starting logout process...');
            showAlert('👋 Logging out...', 'info');
            
            // Call logout API if we have a token
            if (api.token) {
                await api.logout();
                console.log('✅ Server logout successful');
            }
        } catch (error) {
            console.error('⚠️ Logout API error:', error);
            // Continue with client-side cleanup even if server logout fails
        } finally {
            // Comprehensive client-side cleanup
            this.clearStoredSession();
            
            // Clear conflict data
            this.deviceConflictData = null;
            
            // Show login screen
            this.showLogin();
            
            console.log('✅ User logged out completely');
            showAlert('👋 You have been logged out successfully.', 'success');
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

    // Show login screen with enhanced UI
    static showLogin() {
        console.log('🔐 Showing login screen');
        try {
            document.getElementById('loadingScreen').classList.add('hidden');
            document.getElementById('appScreen').classList.add('hidden');
            document.getElementById('loginScreen').classList.remove('hidden');
            
            // Clear any stored credentials and reset form
            this.clearLoginForm();
            
            // Focus on username field for better UX
            setTimeout(() => {
                const usernameField = document.getElementById('username');
                if (usernameField) {
                    usernameField.focus();
                }
            }, 100);
        } catch (error) {
            console.error('❌ Error showing login screen:', error);
        }
    }

    // Show main app with initialization
    static showApp() {
        console.log('🚀 Showing main application');
        try {
            document.getElementById('loadingScreen').classList.add('hidden');
            document.getElementById('loginScreen').classList.add('hidden');
            document.getElementById('appScreen').classList.remove('hidden');
            
            // Initialize app with user context
            if (window.App && typeof App.init === 'function') {
                App.init();
            } else {
                console.error('❌ App.init not found');
                showAlert('Application initialization error. Please refresh the page.', 'danger');
            }
        } catch (error) {
            console.error('❌ Error showing app:', error);
            showAlert('Error loading application. Please refresh the page.', 'danger');
        }
    }

    // Show loading screen
    static showLoading() {
        console.log('⏳ Showing loading screen');
        try {
            document.getElementById('loginScreen').classList.add('hidden');
            document.getElementById('appScreen').classList.add('hidden');
            document.getElementById('loadingScreen').classList.remove('hidden');
        } catch (error) {
            console.error('❌ Error showing loading screen:', error);
        }
    }

    // Clear login form with security considerations
    static clearLoginForm() {
        try {
            const usernameField = document.getElementById('username');
            const passwordField = document.getElementById('password');
            
            if (usernameField) usernameField.value = '';
            if (passwordField) passwordField.value = '';
            
            // Clear any autocomplete artifacts
            if (usernameField) usernameField.setAttribute('autocomplete', 'off');
            if (passwordField) passwordField.setAttribute('autocomplete', 'new-password');
        } catch (error) {
            console.error('❌ Error clearing login form:', error);
        }
    }

    // Utility function to get time of day greeting
    static getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    }

    // Utility function to format relative time
    static getTimeAgo(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            return date.toLocaleDateString();
        } catch (e) {
            return 'Unknown';
        }
    }
}

// Enhanced login form handler with better UX and error handling
function setupLoginForm() {
    console.log('🔧 Setting up login form...');
    
    try {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) {
            console.error('❌ Login form not found!');
            return;
        }
        
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            // Enhanced validation
            if (!username || !password) {
                showAlert('🚫 Please fill in all required fields.', 'danger');
                return;
            }
            
            if (username.length < 2) {
                showAlert('🚫 Username must be at least 2 characters long.', 'danger');
                return;
            }
            
            if (password.length < 3) {
                showAlert('🚫 Password must be at least 3 characters long.', 'danger');
                return;
            }
            
            // Enhanced form state management
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
            
            // Disable form fields
            document.getElementById('username').disabled = true;
            document.getElementById('password').disabled = true;
            
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
                document.getElementById('username').disabled = false;
                document.getElementById('password').disabled = false;
            }
        });

        // Enhanced security and UX improvements
        loginForm.setAttribute('autocomplete', 'off');
        document.getElementById('username').setAttribute('autocomplete', 'off');
        document.getElementById('password').setAttribute('autocomplete', 'new-password');
        
        // Add enter key support for better UX
        document.getElementById('username').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('password').focus();
            }
        });
        
        console.log('✅ Login form setup complete');
    } catch (error) {
        console.error('❌ Error setting up login form:', error);
    }
}

// Logout function (global)
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        Auth.logout();
    }
}

// Enhanced alert system with better error handling
function showAlert(message, type = 'info', duration = 5000) {
    try {
        console.log(`📢 Alert [${type}]: ${message}`);
        
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
            } else {
                // Fallback - append to body
                document.body.appendChild(alert);
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
    } catch (error) {
        console.error('❌ Error showing alert:', error);
        // Fallback to basic alert
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

// Initialize authentication when page loads with comprehensive error handling
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded - Starting initialization...');
    
    try {
        // Show loading screen initially
        Auth.showLoading();
        
        // Set up login form
        setupLoginForm();
        
        // Initialize auth
        Auth.init();
        
        // Check if user is already logged in with reduced delay for testing
        const loadingDelay = CONFIG.UI?.LOADING_DELAY || 1000; // Fallback if CONFIG not available
        
        setTimeout(() => {
            try {
                if (!Auth.initializationComplete) {
                    console.warn('⚠️ Auth initialization not complete, forcing completion');
                    Auth.initializationComplete = true;
                }
                
                if (Auth.isAuthenticated()) {
                    console.log('✅ User already logged in, showing app');
                    Auth.showApp();
                } else {
                    console.log('ℹ️ No valid session, showing login');
                    Auth.showLogin();
                }
            } catch (error) {
                console.error('❌ Error in post-loading logic:', error);
                // Fallback to login screen
                Auth.showLogin();
                showAlert('Initialization error. Please try logging in.', 'warning');
            }
        }, Math.min(loadingDelay, 2000)); // Cap at 2 seconds max
        
    } catch (error) {
        console.error('❌ Critical error during page initialization:', error);
        // Emergency fallback
        setTimeout(() => {
            try {
                Auth.showLogin();
                showAlert('Application startup error. Please refresh if issues persist.', 'danger');
            } catch (fallbackError) {
                console.error('❌ Fallback also failed:', fallbackError);
                alert('Critical error: Please refresh the page');
            }
        }, 1000);
    }

    // Prevent browser from saving passwords
    window.addEventListener('beforeunload', () => {
        try {
            // Clear sensitive form data before page unload
            Auth.clearLoginForm();
        } catch (error) {
            console.error('❌ Error during page unload:', error);
        }
    });
});

// Export Auth class globally
window.Auth = Auth;
window.showAlert = showAlert;

console.log('🔐 Enhanced Auth module loaded with comprehensive error handling');