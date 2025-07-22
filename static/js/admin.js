// Admin Panel JavaScript
let currentTestData = null;
let editingTestCode = null;
let deleteTestCode = null;

// Initialize admin functions
function initializeDashboard() {
    loadDashboardStats();
    loadCharts();
}

function initializeTestManagement() {
    setupTableFilters();
    setupBulkActions();
    updateTableDisplay();
}

function initializeTestCreation() {
    generateQuestionInputs();
    setupFormValidation();
    setupProgressTracking();
}

function initializeResults() {
    setupResultsFilters();
    loadResultsTable();
}

// Dashboard Functions
async function loadDashboardStats() {
    try {
        const response = await fetch('/admin/api/stats');
        const stats = await response.json();

        if (stats.score_distribution) {
            updateScoreChart(stats.score_distribution);
        }

        if (stats.test_popularity) {
            updatePopularityChart(stats.test_popularity);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

function loadCharts() {
    // Initialize Chart.js charts
    initializeScoreChart();
    initializePopularityChart();
}

function updateScoreChart(data) {
    const ctx = document.getElementById('scoreChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Number of Students',
                data: Object.values(data),
                backgroundColor: [
                    '#dc3545', '#ffc107', '#fd7e14', '#20c997', '#198754'
                ],
                borderColor: [
                    '#dc3545', '#ffc107', '#fd7e14', '#20c997', '#198754'
                ],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Score Distribution'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function updatePopularityChart(data) {
    const ctx = document.getElementById('popularityChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: [
                    '#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1', '#20c997'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Test Popularity'
                }
            }
        }
    });
}

// Test Management Functions
function setupTableFilters() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');

    if (searchInput) {
        searchInput.addEventListener('input', filterTests);
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', filterTests);
    }

    setupSelectAll();
}

function setupSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const headerCheckbox = document.getElementById('headerCheckbox');

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.test-checkbox');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }

    if (headerCheckbox) {
        headerCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.test-checkbox');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }
}

function filterTests() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const rows = document.querySelectorAll('#testsTable tbody tr');

    rows.forEach(row => {
        const title = row.querySelector('td:nth-child(3)')?.textContent.toLowerCase() || '';
        const status = row.dataset.status || '';

        const matchesSearch = title.includes(searchTerm);
        const matchesStatus = !statusFilter || status === statusFilter;

        row.style.display = matchesSearch && matchesStatus ? '' : 'none';
    });
}

function setupBulkActions() {
    // Bulk activate/deactivate functionality
    window.bulkActivate = async function() {
        const selected = getSelectedTests();
        if (selected.length === 0) {
            alert('Please select tests to activate.');
            return;
        }

        for (const testCode of selected) {
            await toggleTestStatus(testCode, true);
        }
        location.reload();
    };

    window.bulkDeactivate = async function() {
        const selected = getSelectedTests();
        if (selected.length === 0) {
            alert('Please select tests to deactivate.');
            return;
        }

        for (const testCode of selected) {
            await toggleTestStatus(testCode, false);
        }
        location.reload();
    };
}

function getSelectedTests() {
    const checkboxes = document.querySelectorAll('.test-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

async function toggleTestStatus(testCode, activate = null) {
    try {
        const response = await fetch(`/admin/tests/${testCode}/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        if (result.success) {
            return true;
        } else {
            console.error('Error toggling test status:', result.error);
            return false;
        }
    } catch (error) {
        console.error('Error toggling test status:', error);
        return false;
    }
}

function updateTableDisplay() {
    // Add any additional table display updates
}

// Test Creation Functions
function generateQuestionInputs() {
    generateMCQuestions1to32();
    generateMCQuestions33to35();
    generateTextQuestions36to45();
}

function generateMCQuestions1to32() {
    const container = document.getElementById('mcQuestions1-32');
    if (!container) return;

    container.innerHTML = '';

    for (let i = 1; i <= 32; i++) {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'col-md-6 col-lg-4 mb-3';
        questionDiv.innerHTML = `
            <div class="question-input">
                <label class="form-label fw-bold">Question ${i}</label>
                <select class="form-select" id="q${i}" onchange="updateProgress()">
                    <option value="">Select Answer</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                </select>
            </div>
        `;
        container.appendChild(questionDiv);
    }
}

function generateMCQuestions33to35() {
    const container = document.getElementById('mcQuestions33-35');
    if (!container) return;

    container.innerHTML = '';

    for (let i = 33; i <= 35; i++) {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'col-md-6 col-lg-4 mb-3';
        questionDiv.innerHTML = `
            <div class="question-input">
                <label class="form-label fw-bold">Question ${i}</label>
                <select class="form-select" id="q${i}" onchange="updateProgress()">
                    <option value="">Select Answer</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                    <option value="F">F</option>
                </select>
            </div>
        `;
        container.appendChild(questionDiv);
    }
}

function generateTextQuestions36to45() {
    const container = document.getElementById('textQuestions36-45');
    if (!container) return;

    container.innerHTML = '';

    for (let i = 36; i <= 45; i++) {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'mb-4';
        questionDiv.innerHTML = `
            <div class="question-input">
                <label class="form-label fw-bold">Question ${i}</label>
                <div class="text-parts">
                    <div>
                        <label class="form-label">Part A</label>
                        <input type="text" class="form-control" id="q${i}A" 
                               placeholder="Answer for Part A" onchange="updateProgress()">
                    </div>
                    <div>
                        <label class="form-label">Part B</label>
                        <input type="text" class="form-control" id="q${i}B" 
                               placeholder="Answer for Part B" onchange="updateProgress()">
                    </div>
                </div>
            </div>
        `;
        container.appendChild(questionDiv);
    }
}

function setupFormValidation() {
    // Form validation setup
    document.getElementById('testForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        createTest();
    });
}

function setupProgressTracking() {
    // Progress tracking setup
    updateProgress();
}

function updateProgress() {
    // Update progress bars
    const mc1to32 = [];
    const mc33to35 = [];
    const text36to45 = [];

    // Count MC 1-32
    for (let i = 1; i <= 32; i++) {
        const select = document.getElementById(`q${i}`);
        if (select && select.value) mc1to32.push(i);
    }

    // Count MC 33-35
    for (let i = 33; i <= 35; i++) {
        const select = document.getElementById(`q${i}`);
        if (select && select.value) mc33to35.push(i);
    }

    // Count Text 36-45
    for (let i = 36; i <= 45; i++) {
        const inputA = document.getElementById(`q${i}A`);
        const inputB = document.getElementById(`q${i}B`);
        if (inputA && inputB && inputA.value && inputB.value) {
            text36to45.push(i);
        }
    }

    // Update progress bars
    updateProgressBar('progress1-32', mc1to32.length, 32);
    updateProgressBar('progress33-35', mc33to35.length, 3);
    updateProgressBar('progress36-45', text36to45.length, 10);
}

function updateProgressBar(id, completed, total) {
    const progressBar = document.getElementById(id);
    if (progressBar) {
        const percentage = (completed / total) * 100;
        progressBar.style.width = `${percentage}%`;
    }
}

function generateMCQuestions() {
    // Quick fill for multiple choice questions
    const patterns = ['A', 'B', 'C', 'D'];

    for (let i = 1; i <= 32; i++) {
        const select = document.getElementById(`q${i}`);
        if (select) {
            select.value = patterns[Math.floor(Math.random() * patterns.length)];
        }
    }

    const extendedPatterns = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (let i = 33; i <= 35; i++) {
        const select = document.getElementById(`q${i}`);
        if (select) {
            select.value = extendedPatterns[Math.floor(Math.random() * extendedPatterns.length)];
        }
    }

    updateProgress();
}

function clearAllAnswers() {
    // Clear all answers
    for (let i = 1; i <= 45; i++) {
        const element = document.getElementById(`q${i}`);
        if (element) element.value = '';

        const elementA = document.getElementById(`q${i}A`);
        if (elementA) elementA.value = '';

        const elementB = document.getElementById(`q${i}B`);
        if (elementB) elementB.value = '';
    }

    updateProgress();
}

function previewTest() {
    const testData = collectTestData();
    if (!testData) return;

    // Show preview modal or navigate to preview page
    alert('Preview functionality - Test data collected successfully!');
}

async function createTest() {
    const testData = collectTestData();
    if (!testData) return;

    const loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
    loadingModal.show();

    try {
        const response = await fetch('/admin/tests/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });

        const result = await response.json();

        if (result.success) {
            alert(`Test created successfully! Test Code: ${result.test_code}`);
            window.location.href = '/admin/tests';
        } else {
            alert(`Error creating test: ${result.error}`);
        }
    } catch (error) {
        console.error('Error creating test:', error);
        alert('Error creating test. Please try again.');
    } finally {
        loadingModal.hide();
    }
}

function collectTestData() {
    const title = document.getElementById('testTitle')?.value;
    const description = document.getElementById('testDescription')?.value;
    const timeLimit = document.getElementById('timeLimit')?.value;
    const isActive = document.getElementById('isActive')?.checked;

    if (!title) {
        alert('Please enter a test title.');
        return null;
    }

    const answerKey = {};

    // Collect MC answers 1-32
    for (let i = 1; i <= 32; i++) {
        const answer = document.getElementById(`q${i}`)?.value;
        if (answer) answerKey[i] = answer;
    }

    // Collect MC answers 33-35
    for (let i = 33; i <= 35; i++) {
        const answer = document.getElementById(`q${i}`)?.value;
        if (answer) answerKey[i] = answer;
    }

    // Collect text answers 36-45
    for (let i = 36; i <= 45; i++) {
        const answerA = document.getElementById(`q${i}A`)?.value;
        const answerB = document.getElementById(`q${i}B`)?.value;
        if (answerA && answerB) {
            answerKey[i] = { A: answerA, B: answerB };
        }
    }

    if (Object.keys(answerKey).length === 0) {
        alert('Please provide at least one answer.');
        return null;
    }

    return {
        title,
        description,
        time_limit: timeLimit ? parseInt(timeLimit) : null,
        active: isActive,
        answer_key: answerKey
    };
}

// Test Management Action Functions
async function viewTest(testCode) {
    try {
        const response = await fetch(`/admin/tests/${testCode}`);
        if (!response.ok) {
            throw new Error('Test not found');
        }

        const test = await response.json();
        showTestDetails(test);
    } catch (error) {
        console.error('Error loading test:', error);
        alert('Error loading test details');
    }
}

function showTestDetails(test) {
    const modal = new bootstrap.Modal(document.getElementById('testDetailsModal'));
    const content = document.getElementById('testDetailsContent');

    let answerKeyHtml = '<h6>Answer Key:</h6><div class="row">';

    for (const [questionNum, answer] of Object.entries(test.answer_key)) {
        if (typeof answer === 'object') {
            answerKeyHtml += `
                <div class="col-md-6 mb-2">
                    <strong>Q${questionNum}:</strong> A: ${answer.A}, B: ${answer.B}
                </div>
            `;
        } else {
            answerKeyHtml += `
                <div class="col-md-3 mb-2">
                    <strong>Q${questionNum}:</strong> ${answer}
                </div>
            `;
        }
    }
    answerKeyHtml += '</div>';

    content.innerHTML = `
        <div class="mb-3">
            <h5>${test.title}</h5>
            <p><strong>Code:</strong> ${test.code}</p>
            <p><strong>Status:</strong> 
                <span class="badge bg-${test.active ? 'success' : 'secondary'}">
                    ${test.active ? 'Active' : 'Inactive'}
                </span>
            </p>
            <p><strong>Questions:</strong> ${test.total_questions}</p>
            <p><strong>Time Limit:</strong> ${test.time_limit || 'No limit'}</p>
            <p><strong>Created:</strong> ${test.created_at}</p>
            <p><strong>Created by:</strong> ${test.created_by}</p>
            ${test.description ? `<p><strong>Description:</strong> ${test.description}</p>` : ''}
        </div>
        ${answerKeyHtml}
    `;

    modal.show();
}

async function toggleTest(testCode) {
    try {
        const response = await fetch(`/admin/tests/${testCode}/toggle`, {
            method: 'POST'
        });

        const result = await response.json();
        if (result.success) {
            location.reload();
        } else {
            alert('Error toggling test status');
        }
    } catch (error) {
        console.error('Error toggling test:', error);
        alert('Error toggling test status');
    }
}

function deleteTest(testCode) {
    deleteTestCode = testCode;
    document.getElementById('deleteTestCode').textContent = testCode;
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
}

async function confirmDelete() {
    if (!deleteTestCode) return;

    try {
        const response = await fetch(`/admin/tests/${deleteTestCode}/delete`, {
            method: 'POST'
        });

        const result = await response.json();
        if (result.success) {
            location.reload();
        } else {
            alert('Error deleting test');
        }
    } catch (error) {
        console.error('Error deleting test:', error);
        alert('Error deleting test');
    }

    deleteTestCode = null;
    bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
}

function viewResults(testCode) {
    window.location.href = `/admin/results?test_code=${testCode}`;
}

// Results Functions
function setupResultsFilters() {
    const testFilter = document.getElementById('testFilter');
    const scoreFilter = document.getElementById('scoreFilter');
    const dateFilter = document.getElementById('dateFilter');
    const searchInput = document.getElementById('searchResults');

    [testFilter, scoreFilter, dateFilter].forEach(filter => {
        if (filter) filter.addEventListener('change', filterResults);
    });

    if (searchInput) {
        searchInput.addEventListener('input', filterResults);
    }
}

function filterResults() {
    const testCode = document.getElementById('testFilter')?.value || '';
    const scoreRange = document.getElementById('scoreFilter')?.value || '';
    const dateRange = document.getElementById('dateFilter')?.value || '';
    const searchTerm = document.getElementById('searchResults')?.value.toLowerCase() || '';

    // Redirect with filters for server-side filtering
    const params = new URLSearchParams();
    if (testCode) params.set('test_code', testCode);
    if (scoreRange) params.set('score_range', scoreRange);
    if (dateRange) params.set('date_range', dateRange);
    if (searchTerm) params.set('search', searchTerm);

    window.location.href = `/admin/results?${params.toString()}`;
}

function loadResultsTable() {
    // Additional results table functionality
}

async function viewDetailedResult(resultId) {
    try {
        const response = await fetch(`/admin/api/result/${resultId}`);
        if (!response.ok) {
            throw new Error('Result not found');
        }

        const result = await response.json();
        showResultDetails(result);
    } catch (error) {
        console.error('Error loading result details:', error);
        alert('Error loading result details');
    }
}

function showResultDetails(result) {
    const modal = new bootstrap.Modal(document.getElementById('resultDetailsModal'));
    const content = document.getElementById('resultDetailsContent');

    let answersHtml = '<h6>Student Answers:</h6><div class="row">';

    for (const [questionNum, answer] of Object.entries(result.answers)) {
        answersHtml += `
            <div class="col-md-6 mb-2">
                <strong>Q${questionNum}:</strong> ${typeof answer === 'object' ? 
                    `A: ${answer.A || 'N/A'}, B: ${answer.B || 'N/A'}` : 
                    answer || 'N/A'}
            </div>
        `;
    }
    answersHtml += '</div>';

    content.innerHTML = `
        <div class="mb-3">
            <h5>Result Details</h5>
            <p><strong>Student:</strong> ${result.user_name || 'Unknown'}</p>
            <p><strong>Test Code:</strong> ${result.test_code}</p>
            <p><strong>Score:</strong> ${result.score.toFixed(1)}%</p>
            <p><strong>Submitted:</strong> ${result.submitted_at}</p>
        </div>
        ${answersHtml}
    `;

    modal.show();
}

async function exportResults() {
    const testCode = document.getElementById('testFilter')?.value;
    if (!testCode) {
        alert('Please select a test to export results.');
        return;
    }

    try {
        const response = await fetch(`/admin/api/export/${testCode}`);
        const data = await response.json();

        // Convert to CSV and download
        const csv = convertToCSV(data);
        downloadCSV(csv, `test_${testCode}_results.csv`);
    } catch (error) {
        console.error('Error exporting results:', error);
        alert('Error exporting results');
    }
}

function convertToCSV(data) {
    if (data.length === 0) return '';

    const headers = ['Student Name', 'User ID', 'Score', 'Submitted Date'];
    const rows = data.map(result => [
        result.user_name || 'Unknown',
        result.user_id,
        result.score.toFixed(1),
        result.submitted_at
    ]);

    return [headers, ...rows].map(row =>
        row.map(field => `"${field}"`).join(',')
    ).join('\n');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function refreshResults() {
    location.reload();
}

function initializeScoreChart(scores) {
    const ctx = document.getElementById('scoreDistributionChart');
    if (!ctx || !scores || scores.length === 0) return;

    // Create score ranges
    const ranges = {
        '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0
    };

    scores.forEach(score => {
        if (score <= 20) ranges['0-20']++;
        else if (score <= 40) ranges['21-40']++;
        else if (score <= 60) ranges['41-60']++;
        else if (score <= 80) ranges['61-80']++;
        else ranges['81-100']++;
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(ranges),
            datasets: [{
                label: 'Number of Students',
                data: Object.values(ranges),
                backgroundColor: [
                    '#dc3545', '#ffc107', '#fd7e14', '#20c997', '#198754'
                ],
                borderColor: [
                    '#dc3545', '#ffc107', '#fd7e14', '#20c997', '#198754'
                ],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Initialize Chart.js charts for dashboard
function initializeScoreChart() {
    // This will be called with actual data from the template
}

function initializePopularityChart() {
    // This will be called with actual data from the template
}

// Utility Functions
function showLoading(element) {
    if (element) {
        element.classList.add('loading');
    }
}

function hideLoading(element) {
    if (element) {
        element.classList.remove('loading');
    }
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    const container = document.querySelector('.container').firstElementChild;
    container.insertBefore(alertDiv, container.firstChild);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Export functions for global access
window.initializeDashboard = initializeDashboard;
window.initializeTestManagement = initializeTestManagement;
window.initializeTestCreation = initializeTestCreation;
window.initializeResults = initializeResults;
window.initializeScoreChart = initializeScoreChart;
