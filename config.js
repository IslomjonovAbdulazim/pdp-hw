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
        DEFAULT_DEVICE_NAME: 'Web Browser',
        SESSION_STORAGE_KEY: 'homework_session',
        USER_STORAGE_KEY: 'homework_user'
    },
    
    // Demo Accounts
    DEMO_ACCOUNTS: {
        admin: {
            username: 'azim_islom_admin',
            password: 'AishaBintAli27**',
            deviceName: 'Demo Browser'
        },
        teacher: {
            username: 'teacher1',
            password: 'teacher123',
            deviceName: 'Demo Browser'
        },
        student: {
            username: 'alice',
            password: 'student123',
            deviceName: 'Demo Browser'
        }
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
    },
    
    // Sample Code for Testing
    SAMPLE_CODE: {
        python: {
            title: "Python Calculator Function",
            description: "Create a function called 'calculate' that takes two numbers and an operator (+, -, *, /) and returns the result. Handle division by zero.",
            grading_prompt: "Check if function is correctly defined, handles all operators, includes division by zero handling, has good variable names, and includes comments.",
            file_name: "calculator.py",
            code: `def calculate(a, b, operator):
    """
    Performs basic arithmetic operations on two numbers.
    
    Args:
        a (float): First number
        b (float): Second number  
        operator (str): Operation to perform (+, -, *, /)
    
    Returns:
        float: Result of the operation
    """
    if operator == '+':
        return a + b
    elif operator == '-':
        return a - b
    elif operator == '*':
        return a * b
    elif operator == '/':
        if b == 0:
            return "Error: Division by zero"
        return a / b
    else:
        return "Error: Invalid operator"

# Test the function
print(calculate(10, 5, '+'))   # Should output 15
print(calculate(10, 0, '/'))   # Should handle division by zero`
        },
        
        javascript: {
            title: "JavaScript Array Functions",
            description: "Create functions to find the maximum value in an array and to reverse an array without using built-in methods.",
            grading_prompt: "Evaluate if functions correctly implement max finding and array reversal, use proper JavaScript syntax, handle edge cases, and include meaningful variable names.",
            file_name: "array_functions.js",
            code: `// Function to find maximum value in array
function findMax(arr) {
    if (arr.length === 0) return null;
    
    let max = arr[0];
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            max = arr[i];
        }
    }
    return max;
}

// Function to reverse array without built-in methods
function reverseArray(arr) {
    let reversed = [];
    for (let i = arr.length - 1; i >= 0; i--) {
        reversed.push(arr[i]);
    }
    return reversed;
}

// Test the functions
console.log(findMax([3, 7, 2, 9, 1]));        // Should output 9
console.log(reverseArray([1, 2, 3, 4, 5]));   // Should output [5, 4, 3, 2, 1]`
        },
        
        java: {
            title: "Java Student Grade Calculator",
            description: "Create a Java class that calculates student grades. Include methods to add grades, calculate average, and determine letter grade.",
            grading_prompt: "Check class structure, method implementations, proper Java syntax, encapsulation, and if it handles edge cases like no grades entered.",
            file_name: "GradeCalculator.java",
            code: `import java.util.ArrayList;
import java.util.List;

public class GradeCalculator {
    private List<Double> grades;
    
    public GradeCalculator() {
        this.grades = new ArrayList<>();
    }
    
    public void addGrade(double grade) {
        if (grade >= 0 && grade <= 100) {
            grades.add(grade);
        } else {
            System.out.println("Invalid grade. Must be between 0 and 100.");
        }
    }
    
    public double calculateAverage() {
        if (grades.isEmpty()) {
            return 0.0;
        }
        
        double sum = 0;
        for (double grade : grades) {
            sum += grade;
        }
        return sum / grades.size();
    }
    
    public char getLetterGrade() {
        double avg = calculateAverage();
        if (avg >= 90) return 'A';
        else if (avg >= 80) return 'B';
        else if (avg >= 70) return 'C';
        else if (avg >= 60) return 'D';
        else return 'F';
    }
    
    public static void main(String[] args) {
        GradeCalculator calc = new GradeCalculator();
        calc.addGrade(85.5);
        calc.addGrade(92.0);
        calc.addGrade(78.3);
        
        System.out.println("Average: " + calc.calculateAverage());
        System.out.println("Letter Grade: " + calc.getLetterGrade());
    }
}`
        }
    }
};

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