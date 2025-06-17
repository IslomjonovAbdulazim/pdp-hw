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
        const targetTab = document.querySelector(`[data-view="${viewId}"]`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

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
        const [homework, groups] = await Promise.all([
            api.getTeacherHomework(),
            api.getTeacherGroups()
        ]);

        // Get submissions from first group if available
        let submissions = [];
        if (groups.length > 0) {
            try {
                submissions = await api.getGroupSubmissions(groups[0].id);
            } catch (error) {
                console.warn('Could not load submissions:', error);
            }
        }

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

        const userRank = leaderboard.leaderboard?.find(s => s.student_name === Auth.getCurrentUser().fullname)?.rank || 'N/A';

        const stats = [
            { icon: 'fas fa-book', value: homework.length, label: 'Available' },
            { icon: 'fas fa-check', value: completedHomework, label: 'Completed' },
            { icon: 'fas fa-chart-line', value: `${averageScore}%`, label: 'Average Score' },
            { icon: 'fas fa-trophy', value: `#${userRank}`, label: 'Rank' }
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

    // Load Students (Admin only)
    static async loadStudents() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = Components.createLoading('Loading students...');

        try {
            const [students, groups] = await Promise.all([
                api.getStudents(),
                api.getGroups()
            ]);
            
            contentArea.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Students Management</h2>
                        <button class="btn btn-primary" onclick="App.showCreateStudent()">
                            <i class="fas fa-plus"></i> Add Student
                        </button>
                    </div>
                    ${students.length > 0 ? 
                        students.map(student => 
                            Components.createUserItem(student, [
                                {
                                    icon: 'fas fa-edit',
                                    text: 'Edit',
                                    class: 'btn-warning btn-small',
                                    onclick: `App.showEditStudent(${student.id})`
                                },
                                {
                                    icon: 'fas fa-users',
                                    text: 'Move Group',
                                    class: 'btn-info btn-small',
                                    onclick: `App.showMoveStudent(${student.id})`
                                },
                                {
                                    icon: 'fas fa-trash',
                                    text: 'Delete',
                                    class: 'btn-danger btn-small',
                                    onclick: `App.deleteStudent(${student.id})`
                                }
                            ])
                        ).join('') :
                        Components.createEmptyState(
                            'fas fa-graduation-cap',
                            'No Students Yet',
                            'Add your first student to get started.',
                            '<button class="btn btn-primary" onclick="App.showCreateStudent()"><i class="fas fa-plus"></i> Add Student</button>'
                        )
                    }
                </div>
            `;
            
            // Store groups for later use
            this.data.groups = groups;
        } catch (error) {
            contentArea.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i> Error loading students: ${ApiUtils.handleError(error)}
                </div>
            `;
        }
    }

    // Load Groups
    static async loadGroups() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = Components.createLoading('Loading groups...');

        try {
            const [groups, teachers] = await Promise.all([
                api.getGroups(),
                Auth.isAdmin() ? api.getTeachers() : []
            ]);
            
            contentArea.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">${Auth.isAdmin() ? 'Groups Management' : 'My Groups'}</h2>
                        ${Auth.isAdmin() ? `
                            <button class="btn btn-primary" onclick="App.showCreateGroup()">
                                <i class="fas fa-plus"></i> Add Group
                            </button>
                        ` : ''}
                    </div>
                    ${groups.length > 0 ? 
                        groups.map(group => {
                            let actions = [];
                            if (Auth.isAdmin()) {
                                actions = [
                                    {
                                        icon: 'fas fa-edit',
                                        text: 'Edit',
                                        class: 'btn-warning btn-small',
                                        onclick: `App.showEditGroup(${group.id})`
                                    },
                                    {
                                        icon: 'fas fa-trophy',
                                        text: 'Leaderboard',
                                        class: 'btn-info btn-small',
                                        onclick: `App.showGroupLeaderboard(${group.id})`
                                    },
                                    {
                                        icon: 'fas fa-trash',
                                        text: 'Delete',
                                        class: 'btn-danger btn-small',
                                        onclick: `App.deleteGroup(${group.id})`
                                    }
                                ];
                            } else if (Auth.isTeacher()) {
                                actions = [
                                    {
                                        icon: 'fas fa-trophy',
                                        text: 'Leaderboard',
                                        class: 'btn-info btn-small',
                                        onclick: `App.showGroupLeaderboard(${group.id})`
                                    }
                                ];
                            }
                            return Components.createGroupItem(group, actions);
                        }).join('') :
                        Components.createEmptyState(
                            'fas fa-users',
                            'No Groups Yet',
                            Auth.isAdmin() ? 'Create your first group to get started.' : 'No groups assigned to you yet.',
                            Auth.isAdmin() ? '<button class="btn btn-primary" onclick="App.showCreateGroup()"><i class="fas fa-plus"></i> Add Group</button>' : ''
                        )
                    }
                </div>
            `;
            
            // Store teachers for later use
            this.data.teachers = teachers;
        } catch (error) {
            contentArea.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i> Error loading groups: ${ApiUtils.handleError(error)}
                </div>
            `;
        }
    }

    // Load homework based on user role
    static async loadHomework() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = Components.createLoading('Loading homework...');

        try {
            let homework, title, createButton = '';

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
                                        icon: 'fas fa-file-alt',
                                        text: 'Submissions',
                                        class: 'btn-info btn-small',
                                        onclick: `App.showHomeworkSubmissions(${hw.id})`
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

    // Load submissions based on user role
    static async loadSubmissions() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = Components.createLoading('Loading submissions...');

        try {
            let submissions, title;

            if (Auth.isTeacher()) {
                const groups = await api.getTeacherGroups();
                if (groups.length > 0) {
                    submissions = await api.getGroupSubmissions(groups[0].id);
                    title = `Submissions - ${groups[0].name}`;
                } else {
                    submissions = [];
                    title = 'Submissions';
                }
            } else if (Auth.isStudent()) {
                submissions = await api.getStudentSubmissions();
                title = 'My Submissions';
            }

            contentArea.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">${title}</h2>
                    </div>
                    ${submissions.length > 0 ? 
                        submissions.map(submission => {
                            let actions = [];
                            if (Auth.isTeacher()) {
                                actions = [
                                    {
                                        icon: 'fas fa-eye',
                                        text: 'View Grade',
                                        class: 'btn-info btn-small',
                                        onclick: `App.showTeacherGrade(${submission.id})`
                                    },
                                    {
                                        icon: 'fas fa-edit',
                                        text: 'Edit Grade',
                                        class: 'btn-warning btn-small',
                                        onclick: `App.showEditGrade(${submission.id})`
                                    }
                                ];
                            } else if (Auth.isStudent()) {
                                actions = [
                                    {
                                        icon: 'fas fa-eye',
                                        text: 'View Grade',
                                        class: 'btn-info btn-small',
                                        onclick: `App.showGrade(${submission.id})`
                                    }
                                ];
                            }
                            return Components.createSubmissionItem(submission, actions);
                        }).join('') :
                        Components.createEmptyState(
                            'fas fa-file-alt',
                            'No Submissions Yet',
                            Auth.isTeacher() ? 'Students will submit their homework here.' : 'Submit your first homework to see it here.'
                        )
                    }
                </div>
            `;
        } catch (error) {
            contentArea.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i> Error loading submissions: ${ApiUtils.handleError(error)}
                </div>
            `;
        }
    }

    // Load leaderboard
    static async loadLeaderboard(period = 'all') {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = Components.createLoading('Loading leaderboard...');

        try {
            const data = await api.getStudentLeaderboard(period);
            
            contentArea.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Class Rankings</h2>
                        <div>
                            <select onchange="App.loadLeaderboard(this.value)" class="form-control" style="width: auto; display: inline-block;">
                                <option value="all" ${period === 'all' ? 'selected' : ''}>All Time</option>
                                <option value="month" ${period === 'month' ? 'selected' : ''}>This Month</option>
                                <option value="week" ${period === 'week' ? 'selected' : ''}>This Week</option>
                                <option value="day" ${period === 'day' ? 'selected' : ''}>Today</option>
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

    // Teacher CRUD Operations
    static showCreateTeacher() {
        const fields = [
            { name: 'fullname', label: 'Full Name', type: 'text', required: true, placeholder: 'e.g. John Smith' },
            { name: 'username', label: 'Username', type: 'text', required: true, placeholder: 'e.g. jsmith' },
            { name: 'password', label: 'Password', type: 'password', required: true, placeholder: 'Minimum 8 characters' }
        ];

        openModal('Add New Teacher', Components.createForm(fields, 'Create Teacher', 'App.createTeacher(event)'));
    }

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

    static async showEditTeacher(teacherId) {
        try {
            const teachers = await api.getTeachers();
            const teacher = teachers.find(t => t.id === teacherId);
            
            if (!teacher) {
                showAlert('Teacher not found!', 'danger');
                return;
            }

            const fields = [
                { name: 'fullname', label: 'Full Name', type: 'text', required: true, value: teacher.fullname },
                { name: 'password', label: 'New Password (leave blank to keep current)', type: 'password' }
            ];

            openModal('Edit Teacher', Components.createForm(fields, 'Update Teacher', `App.updateTeacher(event, ${teacherId})`));
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    static async updateTeacher(event, teacherId) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const teacherData = {
            fullname: formData.get('fullname')
        };

        const password = formData.get('password');
        if (password) {
            teacherData.password = password;
        }

        try {
            await api.updateTeacher(teacherId, teacherData);
            showAlert('Teacher updated successfully!', 'success');
            closeModal();
            this.loadTeachers();
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    static async deleteTeacher(teacherId) {
        if (!confirm('Are you sure you want to delete this teacher? This action cannot be undone.')) {
            return;
        }

        try {
            await api.deleteTeacher(teacherId);
            showAlert('Teacher deleted successfully!', 'success');
            this.loadTeachers();
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    // Student CRUD Operations
    static showCreateStudent() {
        const groups = this.data.groups || [];
        const groupOptions = [
            { value: '', label: 'No Group' },
            ...groups.map(g => ({ value: g.id, label: g.name }))
        ];

        const fields = [
            { name: 'fullname', label: 'Full Name', type: 'text', required: true, placeholder: 'e.g. Alice Johnson' },
            { name: 'username', label: 'Username', type: 'text', required: true, placeholder: 'e.g. alice' },
            { name: 'password', label: 'Password', type: 'password', required: true, placeholder: 'Minimum 8 characters' },
            { name: 'group_id', label: 'Group', type: 'select', options: groupOptions }
        ];

        openModal('Add New Student', Components.createForm(fields, 'Create Student', 'App.createStudent(event)'));
    }

    static async createStudent(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const studentData = {
            fullname: formData.get('fullname'),
            username: formData.get('username'),
            password: formData.get('password'),
            role: 'student',
            group_id: formData.get('group_id') ? parseInt(formData.get('group_id')) : null
        };

        try {
            await api.createStudent(studentData);
            showAlert('Student created successfully!', 'success');
            closeModal();
            this.loadStudents();
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    static async showEditStudent(studentId) {
        try {
            const [students, groups] = await Promise.all([
                api.getStudents(),
                api.getGroups()
            ]);
            
            const student = students.find(s => s.id === studentId);
            if (!student) {
                showAlert('Student not found!', 'danger');
                return;
            }

            const groupOptions = [
                { value: '', label: 'No Group' },
                ...groups.map(g => ({ value: g.id, label: g.name }))
            ];

            const fields = [
                { name: 'fullname', label: 'Full Name', type: 'text', required: true, value: student.fullname },
                { name: 'password', label: 'New Password (leave blank to keep current)', type: 'password' },
                { name: 'group_id', label: 'Group', type: 'select', options: groupOptions, value: student.group_id || '' }
            ];

            openModal('Edit Student', Components.createForm(fields, 'Update Student', `App.updateStudent(event, ${studentId})`));
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    static async updateStudent(event, studentId) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const studentData = {
            fullname: formData.get('fullname'),
            group_id: formData.get('group_id') ? parseInt(formData.get('group_id')) : null
        };

        const password = formData.get('password');
        if (password) {
            studentData.password = password;
        }

        try {
            await api.updateStudent(studentId, studentData);
            showAlert('Student updated successfully!', 'success');
            closeModal();
            this.loadStudents();
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    static async deleteStudent(studentId) {
        if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
            return;
        }

        try {
            await api.deleteStudent(studentId);
            showAlert('Student deleted successfully!', 'success');
            this.loadStudents();
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    // Group CRUD Operations
    static showCreateGroup() {
        const teachers = this.data.teachers || [];
        const teacherOptions = teachers.map(t => ({ value: t.id, label: t.fullname }));

        const fields = [
            { name: 'name', label: 'Group Name', type: 'text', required: true, placeholder: 'e.g. Computer Science 101' },
            { name: 'teacher_id', label: 'Teacher', type: 'select', options: teacherOptions, required: true }
        ];

        openModal('Add New Group', Components.createForm(fields, 'Create Group', 'App.createGroup(event)'));
    }

    static async createGroup(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const groupData = {
            name: formData.get('name'),
            teacher_id: parseInt(formData.get('teacher_id'))
        };

        try {
            await api.createGroup(groupData);
            showAlert('Group created successfully!', 'success');
            closeModal();
            this.loadGroups();
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    static async showEditGroup(groupId) {
        try {
            const [groups, teachers] = await Promise.all([
                api.getGroups(),
                api.getTeachers()
            ]);
            
            const group = groups.find(g => g.id === groupId);
            if (!group) {
                showAlert('Group not found!', 'danger');
                return;
            }

            const teacherOptions = teachers.map(t => ({ value: t.id, label: t.fullname }));

            const fields = [
                { name: 'name', label: 'Group Name', type: 'text', required: true, value: group.name },
                { name: 'teacher_id', label: 'Teacher', type: 'select', options: teacherOptions, value: group.teacher_id }
            ];

            openModal('Edit Group', Components.createForm(fields, 'Update Group', `App.updateGroup(event, ${groupId})`));
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    static async updateGroup(event, groupId) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const groupData = {
            name: formData.get('name'),
            teacher_id: parseInt(formData.get('teacher_id'))
        };

        try {
            await api.updateGroup(groupId, groupData);
            showAlert('Group updated successfully!', 'success');
            closeModal();
            this.loadGroups();
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    static async deleteGroup(groupId) {
        if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
            return;
        }

        try {
            await api.deleteGroup(groupId);
            showAlert('Group deleted successfully!', 'success');
            this.loadGroups();
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    // Homework CRUD Operations
    static async showCreateHomework() {
        try {
            const groups = await api.getTeacherGroups();
            const groupOptions = groups.map(g => ({ value: g.id, label: g.name }));

            if (groupOptions.length === 0) {
                showAlert('You need to be assigned to a group first!', 'warning');
                return;
            }

            const languageOptions = Object.entries(CONFIG.LANGUAGES).map(([ext, name]) => ({
                value: ext,
                label: `${name} (${ext})`
            }));

            const fields = [
                { name: 'title', label: 'Assignment Title', type: 'text', required: true, placeholder: 'e.g. Python Functions Practice' },
                { name: 'description', label: 'Description', type: 'textarea', required: true, placeholder: 'Describe the assignment requirements...' },
                { name: 'points', label: 'Total Points', type: 'number', required: true, value: '100', min: '1', max: '1000' },
                { name: 'start_date', label: 'Start Date', type: 'datetime-local', required: true, value: new Date().toISOString().slice(0, 16) },
                { name: 'deadline', label: 'Deadline', type: 'datetime-local', required: true, value: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16) },
                { name: 'line_limit', label: 'Line Limit', type: 'select', required: true, options: [
                    { value: 300, label: '300 lines' },
                    { value: 600, label: '600 lines' },
                    { value: 900, label: '900 lines' },
                    { value: 1200, label: '1200 lines' }
                ]},
                { name: 'file_extension', label: 'Programming Language', type: 'select', required: true, options: languageOptions },
                { name: 'group_id', label: 'Group', type: 'select', required: true, options: groupOptions },
                { name: 'ai_grading_prompt', label: 'AI Grading Criteria', type: 'textarea', required: true, placeholder: 'Specific criteria for the AI to evaluate this assignment...' }
            ];

            openModal('Create New Homework', Components.createForm(fields, 'Create Homework', 'App.createHomework(event)'), 'large');
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    static async createHomework(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const homeworkData = {
            title: formData.get('title'),
            description: formData.get('description'),
            points: parseInt(formData.get('points')),
            start_date: formData.get('start_date'),
            deadline: formData.get('deadline'),
            line_limit: parseInt(formData.get('line_limit')),
            file_extension: formData.get('file_extension'),
            group_id: parseInt(formData.get('group_id')),
            ai_grading_prompt: formData.get('ai_grading_prompt')
        };

        try {
            await api.createHomework(homeworkData);
            showAlert('Homework created successfully!', 'success');
            closeModal();
            this.loadHomework();
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    static async deleteHomework(homeworkId) {
        if (!confirm('Are you sure you want to delete this homework? This action cannot be undone.')) {
            return;
        }

        try {
            await api.deleteHomework(homeworkId);
            showAlert('Homework deleted successfully!', 'success');
            this.loadHomework();
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    // Submission Operations
    static showSubmitHomework(homeworkId) {
        const content = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> Upload your code files for this assignment. Make sure your code follows the requirements and stays within the line limit.
            </div>
            
            <form onsubmit="App.submitHomework(event, ${homeworkId})">
                <div class="form-group">
                    <label for="fileName">File Name</label>
                    <input type="text" id="fileName" name="fileName" class="form-control" required placeholder="e.g. solution.py">
                </div>
                
                <div class="form-group">
                    <label for="fileContent">Code Content</label>
                    <textarea id="fileContent" name="fileContent" class="form-control code-textarea" required placeholder="Paste your code here..."></textarea>
                </div>
                
                <div class="form-group">
                    <button type="submit" class="btn btn-success">
                        <i class="fas fa-upload"></i> Submit Homework
                    </button>
                    <button type="button" class="btn btn-light" onclick="closeModal()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </form>
        `;

        openModal('Submit Homework', content, 'large');
    }

    static async submitHomework(event, homeworkId) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const submissionData = {
            files: [{
                file_name: formData.get('fileName'),
                content: formData.get('fileContent')
            }]
        };

        try {
            await api.submitHomework(homeworkId, submissionData);
            showAlert('Homework submitted successfully! AI grading in progress...', 'success');
            closeModal();
            this.loadHomework();
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    // Grade Operations
    static async showGrade(submissionId) {
        try {
            const grade = await api.getStudentSubmissionGrade(submissionId);
            openModal('Grade Details', Components.createGradeDisplay(grade), 'large');
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    static async showTeacherGrade(submissionId) {
        try {
            const grade = await api.getSubmissionGrade(submissionId);
            openModal('Grade Details', Components.createGradeDisplay(grade), 'large');
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    static async showEditGrade(submissionId) {
        try {
            const grade = await api.getSubmissionGrade(submissionId);
            
            const fields = [
                { 
                    name: 'final_task_completeness', 
                    label: 'Task Completeness (0-100)', 
                    type: 'number', 
                    min: '0', 
                    max: '100', 
                    value: grade.final_task_completeness 
                },
                { 
                    name: 'final_code_quality', 
                    label: 'Code Quality (0-100)', 
                    type: 'number', 
                    min: '0', 
                    max: '100', 
                    value: grade.final_code_quality 
                },
                { 
                    name: 'final_correctness', 
                    label: 'Correctness (0-100)', 
                    type: 'number', 
                    min: '0', 
                    max: '100', 
                    value: grade.final_correctness 
                }
            ];

            openModal('Edit Grade', Components.createForm(fields, 'Update Grade', `App.updateGrade(event, ${submissionId})`));
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    static async updateGrade(event, submissionId) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const gradeData = {
            final_task_completeness: parseInt(formData.get('final_task_completeness')),
            final_code_quality: parseInt(formData.get('final_code_quality')),
            final_correctness: parseInt(formData.get('final_correctness'))
        };

        try {
            await api.updateGrade(submissionId, gradeData);
            showAlert('Grade updated successfully!', 'success');
            closeModal();
            this.loadSubmissions();
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    // Utility methods
    static async showGroupLeaderboard(groupId) {
        try {
            let data;
            if (Auth.isAdmin()) {
                data = await api.getAdminLeaderboard(groupId);
            } else {
                data = await api.getTeacherLeaderboard(groupId);
            }

            const content = `
                <div style="margin-bottom: 20px;">
                    <select onchange="App.changeLeaderboardPeriod(${groupId}, this.value)" class="form-control" style="width: auto; display: inline-block;">
                        <option value="all">All Time</option>
                        <option value="month">This Month</option>
                        <option value="week">This Week</option>
                        <option value="day">Today</option>
                    </select>
                </div>
                <div id="leaderboardContent">
                    ${Components.createLeaderboard(data.leaderboard)}
                </div>
            `;

            openModal(`${data.group_name} Leaderboard`, content, 'large');
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }

    static async changeLeaderboardPeriod(groupId, period) {
        try {
            let data;
            if (Auth.isAdmin()) {
                data = await api.getAdminLeaderboard(groupId, period);
            } else {
                data = await api.getTeacherLeaderboard(groupId, period);
            }

            document.getElementById('leaderboardContent').innerHTML = Components.createLeaderboard(data.leaderboard);
        } catch (error) {
            showAlert(ApiUtils.handleError(error), 'danger');
        }
    }
}

// Export App class globally
window.App = App;