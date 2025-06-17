// Fixed Authentication module with proper device management

class Auth {
    static currentUser = null;
    static deviceConflictData = null;
    static initializationComplete = false;

    // Initialize authentication
    static init() {
        console.log('🔄 Starting authentication initialization...');
        
        try {
            // Check for existing session
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
                    
                    // Validate session in background
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
            this.initializationComplete = true;
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

    // Validate stored session
    static async validateStoredSession() {
        try {
            console.log('🔍 Validating stored session...');
            await api.getHealth();
            console.log('✅ Session validation successful');
            return true;
        } catch (error) {
            console.warn('⚠️ Stored session invalid:', error);
            return false;
        }
    }

    // Generate enhanced device fingerprint
    static generateDeviceFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Device fingerprint', 2, 2);
            
            const fingerprint = {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                screenResolution: `${screen.width}x${screen.height}`,
                colorDepth: screen.colorDepth,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                canvas: canvas.toDataURL(),
                cookieEnabled: navigator.cookieEnabled,
                doNotTrack: navigator.doNotTrack
            };
            
            const fingerprintString = JSON.stringify(fingerprint);
            
            // Simple hash function
            let hash = 0;
            for (let i = 0; i < fingerprintString.length; i++) {
                const char = fingerprintString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            
            return Math.abs(hash).toString(16);
        } catch (error) {
            console.warn('⚠️ Error generating device fingerprint:', error);
            return 'unknown-device';
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
            
            // Detect OS
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
            
            // Add device fingerprint to make it more unique
            const fingerprint = this.generateDeviceFingerprint();
            
            return `${browser} on ${os} (${deviceType}) [${fingerprint.substring(0, 8)}]`;
        } catch (error) {
            console.error('❌ Error detecting device name:', error);
            return 'Unknown Device';
        }
    }

    // Enhanced login with proper device management
    static async login(username, password) {
        console.log(`🔐 Login attempt for: ${username}`);
        
        try {
            showAlert('🔐 Authenticating credentials...', 'info');
            
            // Get enhanced device name
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
                    sessionInfo: response.session_info
                };
                
                localStorage.setItem(CONFIG.APP.USER_STORAGE_KEY, JSON.stringify(sessionData));
                
                console.log('✅ User logged in successfully:', this.currentUser);
                
                // Show personalized welcome message
                const timeOfDay = this.getTimeOfDay();
                const deviceMsg = response.session_info?.is_existing_device ? 
                    'Welcome back from this device!' : 'New device detected and registered.';
                
                showAlert(`🎉 ${timeOfDay}, ${this.currentUser.fullname}! ${deviceMsg}`, 'success');
                
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
                
                // Store conflict data from the detailed API response
                if (error.data) {
                    this.deviceConflictData = {
                        username,
                        password,
                        conflictInfo: error.data
                    };
                    
                    this.showDeviceConflictModal();
                    return false;
                } else {
                    // Fallback for unexpected response format
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

    // Show device conflict modal with real device data
    static showDeviceConflictModal() {
        const data = this.deviceConflictData;
        const conflictInfo = data.conflictInfo;
        
        console.log('📋 Showing device conflict modal with data:', conflictInfo);
        
        const modalContent = `
            <div class="device-conflict-modal">
                <div class="alert alert-warning device-conflict">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Device Limit Reached!</strong>
                    <p>${conflictInfo.message}</p>
                    <div class="device-limit-info">
                        You have <strong>${conflictInfo.current_devices}/${conflictInfo.max_devices}</strong> devices logged in as <strong>${conflictInfo.username}</strong>
                    </div>
                </div>
                
                <div class="help-text">
                    <i class="fas fa-info-circle"></i>
                    ${conflictInfo.help_text}
                </div>
                
                <div class="devices-container">
                    <h4>📱 Your Active Devices</h4>
                    <div class="devices-grid" id="devicesGrid">
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

    // Render active devices with enhanced information
    static renderActiveDevices(devices) {
        if (!devices || devices.length === 0) {
            return '<p class="text-center text-muted">No active devices found.</p>';
        }

        return devices.map(device => {
            const deviceIcon = this.getDeviceIcon(device.device_type, device.browser);
            const statusClass = device.is_suspicious ? 'device-suspicious' : 'device-normal';
            const timeAgo = this.getTimeAgo(device.last_login);
            const location = device.location !== 'Unknown' ? device.location : device.ip_address;
            
            return `
                <div class="device-card ${statusClass}" data-fingerprint="${device.fingerprint}">
                    <div class="device-header">
                        <div class="device-icon">
                            ${deviceIcon}
                        </div>
                        <div class="device-info">
                            <div class="device-name">${device.device_name}</div>
                            <div class="device-meta">
                                <span class="device-type">${device.device_type}</span>
                                <span class="device-browser">${device.browser}</span>
                                <span class="device-os">${device.operating_system}</span>
                            </div>
                        </div>
                        ${device.is_suspicious ? '<div class="suspicious-badge">⚠️ Suspicious</div>' : ''}
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
                            <span class="detail-label">📱 Sessions:</span>
                            <span class="detail-value">${device.session_count} active</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">⏰ Expires:</span>
                            <span class="detail-value">${this.getTimeAgo(device.expires_at)}</span>
                        </div>
                    </div>
                    
                    <div class="device-actions">
                        <button class="btn btn-danger btn-full device-action" 
                                onclick="Auth.forceLoginByTerminating('${device.fingerprint}')"
                                data-fingerprint="${device.fingerprint}">
                            <i class="fas fa-sign-out-alt"></i> 
                            Log out this device & continue
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Force login by terminating specific device
    static async forceLoginByTerminating(deviceFingerprint) {
        if (!this.deviceConflictData) {
            showAlert('🚫 Session data not available. Please try logging in again.', 'danger');
            return;
        }

        const data = this.deviceConflictData;
        
        try {
            // Show loading state on the specific button
            const button = document.querySelector(`[data-fingerprint="${deviceFingerprint}"]`);
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out device...';
            }

            console.log(`🔄 Force login: terminating device ${deviceFingerprint} for ${data.username}`);
            
            showAlert('🔄 Terminating selected device and logging you in...', 'info');
            
            // Get enhanced device name for new session
            const deviceName = this.getEnhancedDeviceName();
            
            // Make force login API call
            const response = await api.forceLogin(data.username, data.password, deviceName, deviceFingerprint);
            
            if (response.access_token && response.user) {
                this.currentUser = response.user;
                
                // Store enhanced session data
                const sessionData = {
                    ...response.user,
                    loginTime: new Date().toISOString(),
                    deviceName: deviceName,
                    sessionInfo: response.session_info,
                    forcedLogin: true,
                    terminatedDevice: deviceFingerprint
                };
                
                localStorage.setItem(CONFIG.APP.USER_STORAGE_KEY, JSON.stringify(sessionData));
                
                console.log('✅ Force login successful:', this.currentUser);
                
                // Clear conflict data
                this.deviceConflictData = null;
                
                // Close modal and show success
                closeModal();
                showAlert(
                    `🎉 Welcome back, ${this.currentUser.fullname}! Previous device has been logged out. (${response.session_info?.terminated_sessions || 0} sessions terminated)`, 
                    'success'
                );
                
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
            const button = document.querySelector(`[data-fingerprint="${deviceFingerprint}"]`);
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-sign-out-alt"></i> Log out this device & continue';
            }
            
            return false;
        }
    }

    // Refresh device list
    static async refreshDeviceList() {
        try {
            const data = this.deviceConflictData;
            showAlert('🔄 Refreshing device list...', 'info');
            
            // Re-attempt login to get updated conflict info
            const response = await api.login(data.username, data.password, this.getEnhancedDeviceName());
            
            // This should trigger a new conflict if devices are still at limit
            showAlert('✅ Device list refreshed', 'success');
            
        } catch (error) {
            if (error.status === 409 && error.data) {
                // Update conflict data with fresh info
                this.deviceConflictData.conflictInfo = error.data;
                
                // Re-render devices
                const devicesGrid = document.getElementById('devicesGrid');
                if (devicesGrid) {
                    devicesGrid.innerHTML = this.renderActiveDevices(error.data.active_sessions);
                }
                
                showAlert('✅ Device list refreshed', 'success');
            } else {
                showAlert('❌ Failed to refresh device list', 'danger');
            }
        }
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
                    To continue, please log out from one of your other devices and try logging in again.
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn btn-light" onclick="Auth.cancelDeviceConflict()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button type="button" class="btn btn-primary" onclick="Auth.retryLogin('${username}', '${password}')">
                        <i class="fas fa-redo"></i> Try Again
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

    // Cancel device conflict and return to login
    static cancelDeviceConflict() {
        this.deviceConflictData = null;
        closeModal();
        showAlert('Login cancelled. You can try again or log out from one of your devices manually.', 'info');
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
            if (browser?.toLowerCase().includes('chrome')) {
                browserIcon = '🔴';
            } else if (browser?.toLowerCase().includes('firefox')) {
                browserIcon = '🦊';
            } else if (browser?.toLowerCase().includes('safari')) {
                browserIcon = '🧭';
            } else if (browser?.toLowerCase().includes('edge')) {
                browserIcon = '🔵';
            }
        } catch (error) {
            console.error('❌ Error getting device icon:', error);
        }
        
        return `<span class="device-icon-combo">${deviceIcon}${browserIcon}</span>`;
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

    // Show login screen
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

    // Show main app
    static showApp() {
        console.log('🚀 Showing main application');
        try {
            document.getElementById('loadingScreen').classList.add('hidden');
            document.getElementById('loginScreen').classList.add('hidden');
            document.getElementById('appScreen').classList.remove('hidden');
            
            // Initialize app
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

    // Clear login form
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

// Enhanced login form handler
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
        
        // Add enter key support
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

// Global functions
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        Auth.logout();
    }
}

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

// Initialize authentication when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded - Starting initialization...');
    
    try {
        // Show loading screen initially
        Auth.showLoading();
        
        // Set up login form
        setupLoginForm();
        
        // Initialize auth
        Auth.init();
        
        // Check if user is already logged in
        const loadingDelay = CONFIG.UI?.LOADING_DELAY || 1000;
        
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
                Auth.showLogin();
                showAlert('Initialization error. Please try logging in.', 'warning');
            }
        }, Math.min(loadingDelay, 2000));
        
    } catch (error) {
        console.error('❌ Critical error during page initialization:', error);
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
            Auth.clearLoginForm();
        } catch (error) {
            console.error('❌ Error during page unload:', error);
        }
    });
});

// Export Auth class globally
window.Auth = Auth;
window.showAlert = showAlert;

console.log('🔐 Enhanced Auth module loaded with proper device management');