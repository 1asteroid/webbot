// Student Web App JavaScript
let currentTest = null;
let currentQuestionIndex = 0;
let userAnswers = {};
let timeRemaining = null;
let timerInterval = null;
let userData = null;

// Initialize web app
function initializeWebApp(user, test) {
    userData = user;
    currentTest = test;

    // Initialize Telegram Web App
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
    }

    // Set user name
    if (userData && userData.name) {
        const nameElement = document.getElementById('studentName');
        if (nameElement) {
            nameElement.textContent = userData.name;
        }
    }

    // If test data is provided, show instructions
    if (currentTest) {
        showTestInstructions();
    }

    setupEventListeners();
}

function setupEventListeners() {
    // Test code input formatting
    const testCodeInput = document.getElementById('testCodeInput');
    if (testCodeInput) {
        testCodeInput.addEventListener('input', function(e) {
            // Only allow digits
            e.target.value = e.target.value.replace(/\D/g, '');

            // Auto-continue if 6 digits entered
            if (e.target.value.length === 6) {
                setTimeout(() => validateTestCode(), 100);
            }
        });

        testCodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                validateTestCode();
            }
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (getCurrentScreen() === 'testScreen') {
            if (e.key === 'ArrowLeft' && currentQuestionIndex > 0) {
                e.preventDefault();
                previousQuestion();
            } else if (e.key === 'ArrowRight' && currentQuestionIndex < 44) {
                e.preventDefault();
                nextQuestion();
            }
        }
    });
}

function getCurrentScreen() {
    const screens = document.querySelectorAll('.screen');
    for (const screen of screens) {
        if (screen.classList.contains('active')) {
            return screen.id;
        }
    }
    return null;
}

async function validateTestCode() {
    const testCodeInput = document.getElementById('testCodeInput');
    const testCode = testCodeInput.value.trim();

    if (testCode.length !== 6) {
        showAlert('Please enter a 6-digit test code.', 'warning');
        return;
    }

    showLoading('Validating test code...');

    try {
        // Simulate API call to validate test code
        const response = await fetch(`/api/validate_test?code=${testCode}&user_id=${userData.id}`);
        const result = await response.json();

        if (result.success) {
            currentTest = result.test;
            showTestInstructions();
        } else {
            showAlert(result.error || 'Invalid test code', 'danger');
        }
    } catch (error) {
        console.error('Error validating test code:', error);
        showAlert('Error validating test code. Please try again.', 'danger');
    } finally {
        hideLoading();
    }
}

function showTestInstructions() {
    if (!currentTest) return;

    const testInfo = document.getElementById('testInfo');
    if (testInfo) {
        testInfo.innerHTML = `
            <h5>${currentTest.title}</h5>
            <p><strong>Test Code:</strong> ${currentTest.code}</p>
            <p><strong>Total Questions:</strong> ${currentTest.total_questions || 45}</p>
            ${currentTest.description ? `<p><strong>Description:</strong> ${currentTest.description}</p>` : ''}
        `;
    }

    // Show time limit warning if applicable
    if (currentTest.time_limit) {
        const timeWarning = document.getElementById('timeWarning');
        const timeLimit = document.getElementById('testTimeLimit');

        if (timeWarning && timeLimit) {
            timeLimit.textContent = currentTest.time_limit;
            timeWarning.style.display = 'block';
        }
    }

    showScreen('instructionsScreen');
}

function startTest() {
    showTestInstructions();
}

function beginTest() {
    if (!currentTest) return;

    // Initialize test data
    currentQuestionIndex = 0;
    userAnswers = {};

    // Setup timer if time limit exists
    if (currentTest.time_limit) {
        timeRemaining = currentTest.time_limit * 60; // Convert to seconds
        setupTimer();
    }

    // Setup questions
    setupQuestionNavigation();

    // Show first question
    showQuestion(0);

    showScreen('testScreen');
}

function setupTimer() {
    const timerDisplay = document.getElementById('timerDisplay');
    const timeRemainingDisplay = document.getElementById('timeRemaining');

    if (timerDisplay && timeRemainingDisplay) {
        timerDisplay.style.display = 'inline-block';

        timerInterval = setInterval(() => {
            timeRemaining--;

            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            timeRemainingDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            // Warning when 5 minutes left
            if (timeRemaining <= 300) {
                timerDisplay.classList.add('warning');
            }

            // Auto-submit when time is up
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                autoSubmitTest();
            }
        }, 1000);
    }
}

function setupQuestionNavigation() {
    const navContainer = document.getElementById('questionNavigation');
    const fullNavContainer = document.getElementById('fullNavigationGrid');

    if (!navContainer) return;

    // Create navigation buttons for all 45 questions
    const navHTML = Array.from({length: 45}, (_, i) => {
        const questionNum = i + 1;
        return `
            <button type="button" class="question-nav-btn" 
                    onclick="navigateToQuestion(${i})" 
                    id="nav-btn-${i}">
                <span>${questionNum}</span>
            </button>
        `;
    }).join('');

    navContainer.innerHTML = navHTML;

    if (fullNavContainer) {
        fullNavContainer.innerHTML = navHTML;
    }

    // Update total questions display
    const totalElements = document.querySelectorAll('#totalQuestions, #totalCount');
    totalElements.forEach(el => el.textContent = '45');
}

function showQuestion(questionIndex) {
    if (questionIndex < 0 || questionIndex >= 45) return;

    currentQuestionIndex = questionIndex;
    const questionNum = questionIndex + 1;

    // Update header
    document.getElementById('currentQuestionNum').textContent = questionNum;
    document.getElementById('testTitle').textContent = currentTest.title;

    // Generate question content
    const questionContent = document.getElementById('questionContent');
    if (questionContent) {
        questionContent.innerHTML = generateQuestionHTML(questionNum);
    }

    // Update navigation
    updateNavigationButtons();
    updateProgressBar();

    // Update prev/next buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) {
        prevBtn.disabled = questionIndex === 0;
    }

    if (nextBtn) {
        if (questionIndex === 44) {
            nextBtn.innerHTML = 'Finish<i class="bi bi-check-circle ms-2"></i>';
            nextBtn.className = 'btn btn-success';
        } else {
            nextBtn.innerHTML = 'Next<i class="bi bi-arrow-right ms-2"></i>';
            nextBtn.className = 'btn btn-primary';
        }
    }

    // Restore user's previous answer
    restoreAnswer(questionNum);
}

function generateQuestionHTML(questionNum) {
    const questionTitle = `
        <div class="question-title">
            <span class="question-number">${questionNum}</span>
            Question ${questionNum}
        </div>
    `;

    if (questionNum <= 32) {
        // Multiple choice A-D
        return questionTitle + `
            <div class="mc-options">
                ${['A', 'B', 'C', 'D'].map(option => `
                    <div class="mc-option" onclick="selectMCOption(${questionNum}, '${option}')">
                        <div class="option-letter">${option}</div>
                        <label>Option ${option}</label>
                        <input type="radio" name="q${questionNum}" value="${option}" style="display: none;">
                    </div>
                `).join('')}
            </div>
        `;
    } else if (questionNum <= 35) {
        // Multiple choice A-F
        return questionTitle + `
            <div class="mc-options">
                ${['A', 'B', 'C', 'D', 'E', 'F'].map(option => `
                    <div class="mc-option" onclick="selectMCOption(${questionNum}, '${option}')">
                        <div class="option-letter">${option}</div>
                        <label>Option ${option}</label>
                        <input type="radio" name="q${questionNum}" value="${option}" style="display: none;">
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        // Text input questions 36-45
        return questionTitle + `
            <div class="text-question">
                <div class="text-parts">
                    <div class="text-part">
                        <label for="q${questionNum}A">Part A</label>
                        <textarea id="q${questionNum}A" placeholder="Enter your answer for Part A..." 
                                onchange="saveTextAnswer(${questionNum}, 'A', this.value)"></textarea>
                    </div>
                    <div class="text-part">
                        <label for="q${questionNum}B">Part B</label>
                        <textarea id="q${questionNum}B" placeholder="Enter your answer for Part B..." 
                                onchange="saveTextAnswer(${questionNum}, 'B', this.value)"></textarea>
                    </div>
                </div>
            </div>
        `;
    }
}

function selectMCOption(questionNum, option) {
    // Save answer
    userAnswers[questionNum] = option;

    // Update UI
    const options = document.querySelectorAll(`input[name="q${questionNum}"]`);
    options.forEach(input => {
        const mcOption = input.closest('.mc-option');
        if (input.value === option) {
            input.checked = true;
            mcOption.classList.add('selected');
        } else {
            input.checked = false;
            mcOption.classList.remove('selected');
        }
    });

    updateNavigationButtons();
    updateProgressBar();
}

function saveTextAnswer(questionNum, part, value) {
    if (!userAnswers[questionNum]) {
        userAnswers[questionNum] = {};
    }
    userAnswers[questionNum][part] = value.trim();

    updateNavigationButtons();
    updateProgressBar();
}

function restoreAnswer(questionNum) {
    const answer = userAnswers[questionNum];

    if (!answer) return;

    if (typeof answer === 'string') {
        // Multiple choice answer
        const radio = document.querySelector(`input[name="q${questionNum}"][value="${answer}"]`);
        if (radio) {
            radio.checked = true;
            radio.closest('.mc-option').classList.add('selected');
        }
    } else if (typeof answer === 'object') {
        // Text answer
        const inputA = document.getElementById(`q${questionNum}A`);
        const inputB = document.getElementById(`q${questionNum}B`);

        if (inputA && answer.A) inputA.value = answer.A;
        if (inputB && answer.B) inputB.value = answer.B;
    }
}

function updateNavigationButtons() {
    for (let i = 0; i < 45; i++) {
        const btn = document.getElementById(`nav-btn-${i}`);
        if (btn) {
            btn.classList.remove('current', 'answered');

            if (i === currentQuestionIndex) {
                btn.classList.add('current');
            } else if (isQuestionAnswered(i + 1)) {
                btn.classList.add('answered');
            }
        }
    }
}

function isQuestionAnswered(questionNum) {
    const answer = userAnswers[questionNum];

    if (!answer) return false;

    if (typeof answer === 'string') {
        return answer.length > 0;
    } else if (typeof answer === 'object') {
        return answer.A && answer.B && answer.A.length > 0 && answer.B.length > 0;
    }

    return false;
}

function updateProgressBar() {
    const answeredCount = Object.keys(userAnswers).filter(q => isQuestionAnswered(parseInt(q))).length;
    const progressBar = document.getElementById('progressBar');
    const answeredCountElement = document.getElementById('answeredCount');

    if (progressBar) {
        const percentage = (answeredCount / 45) * 100;
        progressBar.style.width = `${percentage}%`;
    }

    if (answeredCountElement) {
        answeredCountElement.textContent = answeredCount;
    }
}

function navigateToQuestion(questionIndex) {
    showQuestion(questionIndex);
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        showQuestion(currentQuestionIndex - 1);
    }
}

function nextQuestion() {
    if (currentQuestionIndex < 44) {
        showQuestion(currentQuestionIndex + 1);
    } else {
        showSubmitDialog();
    }
}

function showNavigation() {
    const modal = new bootstrap.Modal(document.getElementById('navigationModal'));
    modal.show();
}

function showSubmitDialog() {
    const answeredCount = Object.keys(userAnswers).filter(q => isQuestionAnswered(parseInt(q))).length;
    const unansweredCount = 45 - answeredCount;

    const submitSummary = document.getElementById('submitSummary');
    if (submitSummary) {
        submitSummary.innerHTML = `
            <p><strong>Progress Summary:</strong></p>
            <ul>
                <li>Answered Questions: <span class="text-success">${answeredCount}</span></li>
                <li>Unanswered Questions: <span class="text-warning">${unansweredCount}</span></li>
                <li>Total Questions: 45</li>
            </ul>
        `;
    }

    const modal = new bootstrap.Modal(document.getElementById('submitModal'));
    modal.show();
}

async function submitTest() {
    if (!currentTest || !userData) {
        showAlert('Error: Missing test or user data', 'danger');
        return;
    }

    // Hide submit modal
    const submitModal = bootstrap.Modal.getInstance(document.getElementById('submitModal'));
    if (submitModal) submitModal.hide();

    // Show loading
    showLoading('Submitting your test...');

    try {
        const response = await fetch('/api/submit_test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userData.id,
                test_code: currentTest.code,
                answers: userAnswers
            })
        });

        const result = await response.json();

        if (result.success) {
            showResults(result.score);
        } else {
            showAlert(result.error || 'Error submitting test', 'danger');
        }
    } catch (error) {
        console.error('Error submitting test:', error);
        showAlert('Error submitting test. Please try again.', 'danger');
    } finally {
        hideLoading();

        // Clear timer
        if (timerInterval) {
            clearInterval(timerInterval);
        }
    }
}

function autoSubmitTest() {
    showAlert('Time is up! Automatically submitting your test...', 'warning');
    setTimeout(() => {
        submitTest();
    }, 2000);
}

function showResults(score) {
    // Update final score
    const finalScoreElement = document.getElementById('finalScore');
    if (finalScoreElement) {
        finalScoreElement.textContent = score.toFixed(1);
    }

    // Show score details
    const scoreDetails = document.getElementById('scoreDetails');
    if (scoreDetails) {
        const answeredCount = Object.keys(userAnswers).filter(q => isQuestionAnswered(parseInt(q))).length;
        const grade = getLetterGrade(score);

        scoreDetails.innerHTML = `
            <div class="row">
                <div class="col-6">
                    <div class="card text-center">
                        <div class="card-body">
                            <h6>Questions Answered</h6>
                            <h4>${answeredCount}/45</h4>
                        </div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="card text-center">
                        <div class="card-body">
                            <h6>Letter Grade</h6>
                            <h4 class="text-${getGradeColor(grade)}">${grade}</h4>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showScreen('resultsScreen');

    // Notify Telegram Web App
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.showAlert(`Test completed! Your score: ${score.toFixed(1)}%`);
    }
}

function getLetterGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}

function getGradeColor(grade) {
    switch (grade) {
        case 'A': return 'success';
        case 'B': return 'info';
        case 'C': return 'warning';
        case 'D': return 'secondary';
        case 'F': return 'danger';
        default: return 'secondary';
    }
}

function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Show target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

function showLoading(message = 'Loading...') {
    const loadingModal = document.getElementById('loadingModal');
    const loadingText = document.getElementById('loadingText');

    if (loadingText) {
        loadingText.textContent = message;
    }

    if (loadingModal) {
        const modal = new bootstrap.Modal(loadingModal);
        modal.show();
    }
}

function hideLoading() {
    const loadingModal = document.getElementById('loadingModal');
    if (loadingModal) {
        const modal = bootstrap.Modal.getInstance(loadingModal);
        if (modal) {
            modal.hide();
        }
    }
}

function showAlert(message, type = 'info') {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Global functions for button clicks
window.validateTestCode = validateTestCode;
window.startTest = startTest;
window.beginTest = beginTest;
window.previousQuestion = previousQuestion;
window.nextQuestion = nextQuestion;
window.navigateToQuestion = navigateToQuestion;
window.showNavigation = showNavigation;
window.showSubmitDialog = showSubmitDialog;
window.submitTest = submitTest;
window.selectMCOption = selectMCOption;
window.saveTextAnswer = saveTextAnswer;
window.initializeWebApp = initializeWebApp;
