// UI Components for Homework Management System

class Components {
    // Create a loading spinner
    static createLoading(message = 'Loading...') {
        return `
            <div class="loading text-center">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
    }

    // Create empty state
    static createEmptyState(icon, title, description, actionButton = '') {
        return `
            <div class="text-center" style="padding: 60px 20px;">
                <i class="${icon}" style="font-size: 64px; color: var(--gray-300); margin-bottom: 20px;"></i>
                <h3 style="color: var(--gray-600); margin-bottom: 10px;">${title}</h3>
                <p style="color: var(--gray-500); margin-bottom: 30px;">${description}</p>
                ${actionButton}
            </div>
        `;
    }

    // Create stats cards
    static createStatsGrid(stats) {
        return `
            <div class="stats-grid">
                ${stats.map(stat => `
                    <div class="stat-card">
                        <i class="${stat.icon} stat-icon"></i>
                        <div class="stat-number">${stat.value}</div>
                        <div class="stat-label">${stat.label}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Create homework list item
    static createHomeworkItem(homework, actions = []) {
        const deadline = new Date(homework.deadline);
        const isOverdue = deadline < new Date();
        const deadlineClass = isOverdue ? 'text-danger' : '';
        
        return `
            <div class="list-item">
                <div class="list-item-header">
                    <div class="list-item-title">${homework.title}</div>
                    <div class="list-item-badge">${homework.points} pts</div>
                </div>
                <div class="list-item-meta">
                    <span><i class="fas fa-user"></i> ${homework.teacher_name || 'Unknown'}</span>
                    <span><i class="fas fa-users"></i> ${homework.group_name || 'Unknown'}</span>
                    <span class="${deadlineClass}"><i class="fas fa-clock"></i> Due: ${ApiUtils.formatDate(homework.deadline)}</span>
                    <span><i class="fas fa-code"></i> ${CONFIG.LANGUAGES[homework.file_extension] || homework.file_extension}</span>
                </div>
                <div class="list-item-description">${homework.description}</div>
                ${actions.length > 0 ? `
                    <div class="list-item-actions">
                        ${actions.map(action => `
                            <button class="btn ${action.class}" onclick="${action.onclick}">
                                <i class="${action.icon}"></i> ${action.text}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Create submission item
    static createSubmissionItem(submission, actions = []) {
        const scoreColor = ApiUtils.getScoreColor(submission.final_grade);
        const scoreEmoji = ApiUtils.getScoreEmoji(submission.final_grade);
        
        return `
            <div class="list-item">
                <div class="list-item-header">
                    <div class="list-item-title">${submission.homework_title || 'Unknown Assignment'}</div>
                    <div class="list-item-badge" style="background: ${scoreColor};">
                        ${scoreEmoji} ${submission.final_grade}/100
                    </div>
                </div>
                <div class="list-item-meta">
                    <span><i class="fas fa-user"></i> ${submission.student_name || 'Unknown Student'}</span>
                    <span><i class="fas fa-clock"></i> ${ApiUtils.formatRelativeTime(submission.submitted_at)}</span>
                    <span><i class="fas fa-robot"></i> AI Score: ${submission.ai_grade}/100</span>
                </div>
                <div class="list-item-description">${submission.ai_feedback}</div>
                ${actions.length > 0 ? `
                    <div class="list-item-actions">
                        ${actions.map(action => `
                            <button class="btn ${action.class}" onclick="${action.onclick}">
                                <i class="${action.icon}"></i> ${action.text}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Create user item (for admin)
    static createUserItem(user, actions = []) {
        const roleColors = {
            admin: 'var(--danger)',
            teacher: 'var(--primary)',
            student: 'var(--success)'
        };
        
        return `
            <div class="list-item">
                <div class="list-item-header">
                    <div class="list-item-title">${user.fullname}</div>
                    <div class="list-item-badge" style="background: ${roleColors[user.role]};">
                        ${user.role.toUpperCase()}
                    </div>
                </div>
                <div class="list-item-meta">
                    <span><i class="fas fa-user"></i> ${user.username}</span>
                    <span><i class="fas fa-calendar"></i> ${ApiUtils.formatDate(user.created_at)}</span>
                    ${user.group_id ? `<span><i class="fas fa-users"></i> Group ${user.group_id}</span>` : ''}
                </div>
                ${actions.length > 0 ? `
                    <div class="list-item-actions">
                        ${actions.map(action => `
                            <button class="btn ${action.class}" onclick="${action.onclick}">
                                <i class="${action.icon}"></i> ${action.text}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Create group item
    static createGroupItem(group, actions = []) {
        return `
            <div class="list-item">
                <div class="list-item-header">
                    <div class="list-item-title">${group.name}</div>
                    <div class="list-item-badge">${group.student_count} students</div>
                </div>
                <div class="list-item-meta">
                    <span><i class="fas fa-user"></i> ${group.teacher_name || 'No teacher assigned'}</span>
                    <span><i class="fas fa-calendar"></i> ${ApiUtils.formatDate(group.created_at)}</span>
                </div>
                ${actions.length > 0 ? `
                    <div class="list-item-actions">
                        ${actions.map(action => `
                            <button class="btn ${action.class}" onclick="${action.onclick}">
                                <i class="${action.icon}"></i> ${action.text}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Create leaderboard
    static createLeaderboard(leaderboard) {
        if (!leaderboard || leaderboard.length === 0) {
            return this.createEmptyState(
                'fas fa-trophy',
                'No Rankings Yet',
                'Submit some homework to see the leaderboard!'
            );
        }

        return `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title"><i class="fas fa-trophy"></i> Leaderboard</h3>
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Student</th>
                            <th>Total Points</th>
                            <th>Submissions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${leaderboard.map((student, index) => {
                            let rankIcon = '';
                            if (index === 0) rankIcon = '🥇';
                            else if (index === 1) rankIcon = '🥈';
                            else if (index === 2) rankIcon = '🥉';
                            
                            return `
                                <tr>
                                    <td>${rankIcon} #${student.rank}</td>
                                    <td>${student.student_name}</td>
                                    <td><strong>${student.total_points}</strong></td>
                                    <td>${student.submission_count}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Create form for creating/editing entities
    static createForm(fields, submitText = 'Save', onSubmit = '') {
        return `
            <form onsubmit="${onSubmit}">
                ${fields.map(field => {
                    if (field.type === 'textarea') {
                        return `
                            <div class="form-group">
                                <label for="${field.name}">${field.label}</label>
                                <textarea id="${field.name}" name="${field.name}" class="form-control" 
                                         ${field.required ? 'required' : ''}
                                         placeholder="${field.placeholder || ''}">${field.value || ''}</textarea>
                            </div>
                        `;
                    } else if (field.type === 'select') {
                        return `
                            <div class="form-group">
                                <label for="${field.name}">${field.label}</label>
                                <select id="${field.name}" name="${field.name}" class="form-control" 
                                       ${field.required ? 'required' : ''}>
                                    ${field.options.map(option => `
                                        <option value="${option.value}" ${field.value === option.value ? 'selected' : ''}>
                                            ${option.label}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        `;
                    } else {
                        return `
                            <div class="form-group">
                                <label for="${field.name}">${field.label}</label>
                                <input type="${field.type || 'text'}" id="${field.name}" name="${field.name}" 
                                       class="form-control" value="${field.value || ''}"
                                       ${field.required ? 'required' : ''}
                                       placeholder="${field.placeholder || ''}"
                                       ${field.min ? `min="${field.min}"` : ''}
                                       ${field.max ? `max="${field.max}"` : ''}
                                       ${field.step ? `step="${field.step}"` : ''}>
                            </div>
                        `;
                    }
                }).join('')}
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> ${submitText}
                    </button>
                    <button type="button" class="btn btn-light" onclick="closeModal()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </form>
        `;
    }

    // Create grade display
    static createGradeDisplay(grade) {
        return `
            <div class="score-card total-score">
                <h4>🎯 Total Score</h4>
                <div style="font-size: 32px; margin: 15px 0;">${grade.final_task_completeness + grade.final_code_quality + grade.final_correctness}/300</div>
                <p>${grade.ai_feedback}</p>
            </div>
            
            <div class="score-card">
                <div class="score-header">
                    <span class="score-title">📋 Task Completeness</span>
                    <span class="score-value" style="color: ${ApiUtils.getScoreColor(grade.final_task_completeness)}">${grade.final_task_completeness}/100</span>
                </div>
                <div class="score-feedback">${grade.task_completeness_feedback}</div>
            </div>
            
            <div class="score-card">
                <div class="score-header">
                    <span class="score-title">🎨 Code Quality</span>
                    <span class="score-value" style="color: ${ApiUtils.getScoreColor(grade.final_code_quality)}">${grade.final_code_quality}/100</span>
                </div>
                <div class="score-feedback">${grade.code_quality_feedback}</div>
            </div>
            
            <div class="score-card">
                <div class="score-header">
                    <span class="score-title">✅ Correctness</span>
                    <span class="score-value" style="color: ${ApiUtils.getScoreColor(grade.final_correctness)}">${grade.final_correctness}/100</span>
                </div>
                <div class="score-feedback">${grade.correctness_feedback}</div>
            </div>
            
            ${grade.modified_by_teacher ? `
                <div class="alert alert-info">
                    <i class="fas fa-user-edit"></i> This grade was modified by a teacher on ${ApiUtils.formatDate(grade.modified_by_teacher)}
                </div>
            ` : ''}
        `;
    }
}

// Modal functions
function openModal(title, content, size = '') {
    const modal = document.getElementById('modal');
    const modalContent = modal.querySelector('.modal-content');
    
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    
    if (size) {
        modalContent.classList.add(`modal-${size}`);
    }
    
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('modal');
    const modalContent = modal.querySelector('.modal-content');
    
    modal.classList.remove('active');
    modalContent.classList.remove('modal-large', 'modal-small');
}

// Test grading modal functions
function openTestGrading() {
    document.getElementById('testGradingModal').classList.add('active');
    loadSampleCode('python'); // Load Python sample by default
}

function closeTestGrading() {
    document.getElementById('testGradingModal').classList.remove('active');
}

function loadSampleCode(type) {
    const sample = CONFIG.SAMPLE_CODE[type];
    if (sample) {
        document.getElementById('testTitle').value = sample.title;
        document.getElementById('testDescription').value = sample.description;
        document.getElementById('testCriteria').value = sample.grading_prompt;
        document.getElementById('testFileName').value = sample.file_name;
        document.getElementById('testCode').value = sample.code;
        
        // Set appropriate language
        document.getElementById('testLanguage').value = type === 'python' ? '.py' : 
                                                       type === 'javascript' ? '.js' : '.java';
    }
}

async function testGradeCode() {
    const btn = document.getElementById('testGradeBtn');
    const results = document.getElementById('testResults');
    
    // Get form data
    const data = {
        title: document.getElementById('testTitle').value,
        description: document.getElementById('testDescription').value,
        points: parseInt(document.getElementById('testPoints').value),
        file_extension: document.getElementById('testLanguage').value,
        ai_grading_prompt: document.getElementById('testCriteria').value,
        files: [{
            file_name: document.getElementById('testFileName').value,
            content: document.getElementById('testCode').value
        }]
    };
    
    // Validate required fields
    if (!data.title || !data.description || !data.ai_grading_prompt || !data.files[0].content) {
        showAlert('Please fill in all required fields!', 'warning');
        return;
    }
    
    // Show loading state
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Grading...';
    results.innerHTML = Components.createLoading('AI is analyzing the code...');
    
    try {
        const result = await api.testGrading(data);
        
        // Display results using Components
        results.innerHTML = `
            <div class="score-card total-score">
                <h4>🎯 Total Score</h4>
                <div style="font-size: 24px; margin: 10px 0;">${result.total}/100</div>
                <p>${result.overall_feedback}</p>
            </div>
            
            <div class="score-card">
                <div class="score-header">
                    <span class="score-title">📋 Task Completeness</span>
                    <span class="score-value" style="color: ${ApiUtils.getScoreColor(result.task_completeness)}">${result.task_completeness}/100</span>
                </div>
                <div class="score-feedback">${result.task_completeness_feedback}</div>
            </div>
            
            <div class="score-card">
                <div class="score-header">
                    <span class="score-title">🎨 Code Quality</span>
                    <span class="score-value" style="color: ${ApiUtils.getScoreColor(result.code_quality)}">${result.code_quality}/100</span>
                </div>
                <div class="score-feedback">${result.code_quality_feedback}</div>
            </div>
            
            <div class="score-card">
                <div class="score-header">
                    <span class="score-title">✅ Correctness</span>
                    <span class="score-value" style="color: ${ApiUtils.getScoreColor(result.correctness)}">${result.correctness}/100</span>
                </div>
                <div class="score-feedback">${result.correctness_feedback}</div>
            </div>
        `;
        
    } catch (error) {
        const message = ApiUtils.handleError(error);
        results.innerHTML = `
            <div class="alert alert-danger">
                <h4><i class="fas fa-exclamation-circle"></i> Error</h4>
                <p>${message}</p>
                <p style="font-size: 14px; margin-top: 10px;">
                    Make sure the server is running and try again.
                </p>
            </div>
        `;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-rocket"></i> Grade This Code!';
    }
}

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        if (e.target.id === 'testGradingModal') {
            closeTestGrading();
        } else {
            closeModal();
        }
    }
});

// Export Components globally
window.Components = Components;
window.openModal = openModal;
window.closeModal = closeModal;
window.openTestGrading = openTestGrading;
window.closeTestGrading = closeTestGrading;
window.loadSampleCode = loadSampleCode;
window.testGradeCode = testGradeCode;