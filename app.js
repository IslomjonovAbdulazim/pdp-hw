// Main application logic for Homework Management System

class App {
    static currentView = null;
    static data = {};

    // Initialize the application
    static init() {
        this.setupUserInfo();
        this.setupNavigation();
        this.loadDashboard();
    }

    // Setup user information in header
    static setupUserInfo() {
        const user = Auth.getCurrentUser();
        if (user) {
            document.getElementById('userName').textContent = user.fullname;
            document.getElementById('userRole').textContent = user.role.toUpperCase();
        }
    }

    // Setup navigation based on user role
    static setupNavigation() {
        const user = Auth.getCurrentUser();
        const navTabs = document.getElementById('navTabs');
        let tabs = [];

        if (Auth.isAdmin()) {
            tabs = [
                { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
                { id: 'teachers', label: 'Teachers', icon: 'fas fa-chalkboard-teacher' },
                { id: 'students', label: 'Students', icon: 'fas fa-graduation-cap' },
                { id: 'groups', label: 'Groups', icon: 'fas fa-users' },
                { id: 'test', label: 'Test Grading', icon: 'fas fa-robot' }
            ];
        } else if (Auth.isTeacher()) {
            tabs = [
                { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
                { id: 'homework', label: 'Homework', icon: 'fas fa-book' },
                { id: 'submissions', label: 'Submissions', icon: 'fas fa-file-alt' },
                { id: 'groups', label: 'My Groups', icon: 'fas fa-users' },
                { id: 'test', label: 'Test Grading', icon: 'fas fa-robot' }
            ];
        } else if (Auth.isStudent()) {
            tabs = [
                { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
                { id: 'homework', label: 'Homework', icon: 'fas fa-book' },
                { id: 'submissions', label: 'My Submissions', icon: 'fas fa-file-alt' },
                { id: 'leaderboard', label: 'Leaderboard', icon: 'fas fa-trophy' },
                { id: 'test', label: 'Test Grading', icon: 'fas fa-robot' }
            ];
        }

        navTabs.innerHTML = tabs.map(tab => `
            <button class="nav-tab" onclick="App.switchView('${tab.id}')" data-view="${tab.id}">
                <i class="${tab.icon}"></i> ${tab.label}
            </button>
        `).join('');
    }

    // Switch between different views
    static switchView(viewId) {
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewId}"]`).classList.add('active');

        // Load view content
        this.currentView = viewId;
        
        switch (viewId) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'teachers':
                this.loadTeachers();
                break;
            case 'students':
                this.loadStudents();
                break;
            case 'groups':
                this.loadGroups();
                break;
            case 'homework':
                this.loadHomework();
                break;
            case 'submissions':
                this.loadSubmissions();
                break;
            case 'leaderboard':
                this.loadLeaderboard();
                break;
            case 'test':
                openTestGrading();
                break;
        }
    }

    // Load dashboard based on user role
    static async loadDashboard() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = Components.createLoading('Loading dashboard...');

        try {
            if (Auth.isAdmin()) {
                await this.loadAdminDashboard();
            } else if (Auth.isTeacher()) {
                await this.loadTeacherDashboard();
            } else if (Auth.isStudent()) {
                await this.loadStudentDashboard();
            }
        } catch (error) {
            contentArea.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i> Error loading dashboard: ${ApiUtils.handleError(error)}
                </div>
            `;
        }
    }

    // Admin Dashboard
    static async loadAdminDashboard() {
        const [teachers, students, groups] = await Promise.all([
            api.getTeachers(),
            api.getStudents(),
            api.getGroups()
        ]);

        const stats = [
            { icon: 'fas fa-chalkboard-teacher', value: teachers.length, label: 'Teachers' },
            { icon: 'fas fa-graduation-cap', value: students.length, label: 'Students' },
            { icon: 'fas fa-users', value: groups.length, label: 'Groups' },
            { icon: 'fas fa-server', value: 'Online', label: 'System Status' }
        ];

        document.getElementById('contentArea').innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Admin Dashboard</h2>
                </div>
                ${Components.createStatsGrid(stats)}
                
                <div class="grid grid-2">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Recent Teachers</h3>
                            <button class="btn btn-primary btn-small" onclick="App.switchView('teachers')">
                                <i class="fas fa-plus"></i> Manage Teachers
                            </button>
                        </div>
                        ${teachers.slice(0, 5).map(teacher => 
                            Components.createUserItem(teacher, [])
                        ).join('') || '<p class="text-muted text-center">No teachers yet</p>'}
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Recent Groups</h3>
                            <button class="btn btn-primary btn-small" onclick="App.switchView('groups')">
                                <i class="fas fa-plus"></i> Manage Groups
                            </button>
                        </div>
                        ${groups.slice(0, 5).map(group => 
                            Components.createGroupItem(group, [])
                        ).join('') || '<p class="text-muted text-center">No groups yet</p>'}
                    </div>
                </div>
            </div>
        `;
    }

    // Teacher Dashboard
    static async loadTeacherDashboard() {
        const [homework, groups, submissions] = await Promise.all([
            api.getTeacherHomework(),
            api.getTeacherGroups(),
            groups.length > 0 ? api.getGroupSubmissions(groups[0].id) : []
        ]);

        const stats = [
            { icon: 'fas fa-book', value: homework.length, label: 'Assignments' },
            { icon: 'fas fa-users', value: groups.length, label: 'Groups' },
            { icon: 'fas fa-file-alt', value: submissions.length, label: 'Submissions' },
            { icon: 'fas fa-clock', value: homework.filter(h => new Date(h.deadline) > new Date()).length, label: 'Active' }
        ];

        document.getElementById('contentArea').innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Teacher Dashboard</h2>
                </div>
                ${Components.createStatsGrid(stats)}
                
                <div class="grid grid-2">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Recent Homework</h3>
                            <button class="btn btn-primary btn-small" onclick="App.switchView('homework')">
                                <i class="fas fa-plus"></i> Create Homework
                            </button>
                        </div>
                        ${homework.slice(0, 3).map(hw => 
                            Components.createHomeworkItem(hw, [])
                        ).join('') || '<p class="text-muted text-center">No homework yet</p>'}
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Recent Submissions</h3>
                            <button class="btn btn-primary btn-small" onclick="App.switchView('submissions')">
                                <i class="fas fa-eye"></i> View All
                            </button>
                        </div>
                        ${submissions.slice(0, 3).map(submission => 
                            Components.createSubmissionItem(submission, [])
                        ).join('') || '<p class="text-muted text-center">No submissions yet</p>'}
                    </div>
                </div>
            </div>
        `;
    }

    // Student Dashboard
    static async loadStudentDashboard() {
        const [homework, submissions, leaderboard] = await Promise.all([
            api.getStudentHomework(),
            api.getStudentSubmissions(5),
            api.getStudentLeaderboard()
        ]);

        const completedHomework = submissions.length;
        const averageScore = submissions.length > 0 ? 
            Math.round(submissions.reduce((sum, s) => sum + s.final_grade, 0) / submissions.length) : 0;

        const stats = [
            { icon: 'fas fa-book', value: homework.length, label: 'Available' },
            { icon: 'fas fa-check', value: completedHomework, label: 'Completed' },
            { icon: 'fas fa-chart-line', value: `${averageScore}%`, label: 'Average Score' },
            { icon: 'fas fa-trophy', value: `#${leaderboard.leaderboard?.find(s => s.student_name === Auth.getCurrentUser().fullname)?.rank || 'N/A'}`, label: 'Rank' }
        ];

        document.getElementById('contentArea').innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Student Dashboard</h2>
                </div>
                ${Components.createStatsGrid(stats)}
                
                <div class="grid grid-2">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Available Homework</h3>
                            <button class="btn btn-primary btn-small" onclick="App.switchView('homework')">
                                <i class="fas fa-eye"></i> View All
                            </button>
                        </div>
                        ${homework.slice(0, 3).map(hw => 
                            Components.createHomeworkItem(hw, [{
                                icon: 'fas fa-upload',
                                text: 'Submit',
                                class: 'btn-success',
                                onclick: `App.showSubmitHomework(${hw.id})`
                            }])
                        ).join('') || '<p class="text-muted text-center">No homework available</p>'}
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Recent Submissions</h3>
                            <button class="btn btn-primary btn-small" onclick="App.switchView('submissions')">
                                <i class="fas fa-eye"></i> View All
                            </button>
                        </div>
                        ${submissions.slice(0, 3).map(submission => 
                            Components.createSubmissionItem(submission, [{
                                icon: 'fas fa-eye',
                                text: 'View Grade',
                                class: 'btn-info',
                                onclick: `App.showGrade(${submission.id})`
                            }])
                        ).join('') || '<p class="text-muted text-center">No submissions yet</p>'}
                    </div>
                </div>
            </div>
        `;
    }

    // Load Teachers (Admin only)
    static async loadTeachers() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = Components.createLoading('Loading teachers...');

        try {
            const teachers = await api.getTeachers();
            
            contentArea.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Teachers Management</h2>
                        <button class="btn btn-primary" onclick="App.showCreateTeacher()">
                            <i class="fas fa-plus"></i> Add Teacher
                        </button>
                    </div>
                    ${teachers.length > 0 ? 
                        teachers.map(teacher => 
                            Components.createUserItem(teacher, [
                                {
                                    icon: 'fas fa-edit',
                                    text: 'Edit',
                                    class: 'btn-warning btn-small',
                                    onclick: `App.showEditTeacher(${teacher.id})`
                                },
                                {
                                    icon: 'fas fa-trash',
                                    text: 'Delete',
                                    class: 'btn-danger btn-small',
                                    onclick: `App.deleteTeacher(${teacher.id})`
                                }
                            ])
                        ).join('') :
                        Components.createEmptyState(
                            'fas fa-chalkboard-teacher',
                            'No Teachers Yet',
                            'Add your first teacher to get started.',
                            '<button class="btn btn-primary" onclick="App.showCreateTeacher()"><i class="fas fa-plus"></i> Add Teacher</button>'
                        )
                    }
                </div>
            `;
        } catch (error) {
            contentArea.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i> Error loading teachers: ${ApiUtils.handleError(error)}
                </div>
            `;
        }
    }

    // Show create teacher form
    static showCreateTeacher() {
        const fields = [
            { name: 'fullname', label: 'Full Name', type: 'text', required: true },
            { name: 'username', label: 'Username', type: 'text', required: true },
            { name: 'password', label: 'Password', type: 'password', required: true }
        ];

        openModal('Add New Teacher', Components.createForm(fields, 'Create Teacher', 'App.createTeacher(event)'));
    }

    // Create teacher
    static async createTeacher(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const teacherData = {
            fullname: formData.get('fullname'),
            username: formData.get('username'),
            password: formData.get('password'),
            role: 'teacher'
        };

        try {
            await api.createTeacher(teacherData);
            showAlert('Teacher created successfully!', 'success');
            closeModal();
            this.loadTeachers();
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    // Load homework based on user role
    static async loadHomework() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = Components.createLoading('Loading homework...');

        try {
            let homework;
            let title;
            let createButton = '';

            if (Auth.isTeacher()) {
                homework = await api.getTeacherHomework();
                title = 'Homework Management';
                createButton = `
                    <button class="btn btn-primary" onclick="App.showCreateHomework()">
                        <i class="fas fa-plus"></i> Create Homework
                    </button>
                `;
            } else if (Auth.isStudent()) {
                homework = await api.getStudentHomework();
                title = 'Available Homework';
            }

            contentArea.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">${title}</h2>
                        ${createButton}
                    </div>
                    ${homework.length > 0 ? 
                        homework.map(hw => {
                            let actions = [];
                            if (Auth.isTeacher()) {
                                actions = [
                                    {
                                        icon: 'fas fa-edit',
                                        text: 'Edit',
                                        class: 'btn-warning btn-small',
                                        onclick: `App.showEditHomework(${hw.id})`
                                    },
                                    {
                                        icon: 'fas fa-trash',
                                        text: 'Delete',
                                        class: 'btn-danger btn-small',
                                        onclick: `App.deleteHomework(${hw.id})`
                                    }
                                ];
                            } else if (Auth.isStudent()) {
                                actions = [
                                    {
                                        icon: 'fas fa-upload',
                                        text: 'Submit',
                                        class: 'btn-success',
                                        onclick: `App.showSubmitHomework(${hw.id})`
                                    }
                                ];
                            }
                            return Components.createHomeworkItem(hw, actions);
                        }).join('') :
                        Components.createEmptyState(
                            'fas fa-book',
                            'No Homework Available',
                            Auth.isTeacher() ? 'Create your first homework assignment.' : 'No homework has been assigned yet.',
                            Auth.isTeacher() ? '<button class="btn btn-primary" onclick="App.showCreateHomework()"><i class="fas fa-plus"></i> Create Homework</button>' : ''
                        )
                    }
                </div>
            `;
        } catch (error) {
            contentArea.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i> Error loading homework: ${ApiUtils.handleError(error)}
                </div>
            `;
        }
    }

    // Show submit homework modal
    static showSubmitHomework(homeworkId) {
        // This would open a file upload modal
        // For now, show a simple alert
        showAlert('File upload functionality would be implemented here', 'info');
    }

    // Show grade modal
    static async showGrade(submissionId) {
        try {
            const grade = await api.getStudentSubmissionGrade(submissionId);
            openModal('Grade Details', Components.createGradeDisplay(grade), 'large');
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    // Load leaderboard (Student only)
    static async loadLeaderboard() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = Components.createLoading('Loading leaderboard...');

        try {
            const data = await api.getStudentLeaderboard();
            
            contentArea.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Class Rankings</h2>
                        <div>
                            <select onchange="App.loadLeaderboard(this.value)" class="form-control" style="width: auto; display: inline-block;">
                                <option value="all">All Time</option>
                                <option value="month">This Month</option>
                                <option value="week">This Week</option>
                                <option value="day">Today</option>
                            </select>
                        </div>
                    </div>
                    ${Components.createLeaderboard(data.leaderboard)}
                </div>
            `;
        } catch (error) {
            contentArea.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i> Error loading leaderboard: ${ApiUtils.handleError(error)}
                </div>
            `;
        }
    }

    // Additional methods would be implemented here for:
    // - loadStudents(), loadGroups(), loadSubmissions()
    // - CRUD operations for each entity type
    // - Form handling and validation
    // - Error handling and user feedback
}

// Export App class globally
window.App = App;