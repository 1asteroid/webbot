"""
Data Management Module
Handles all data operations for tests, users, and results
"""

import json
import os
import random
import string
from datetime import datetime
from typing import Dict, List, Optional, Any


class DataManager:
    def __init__(self):
        self.data_dir = "data"
        self.ensure_data_directory()

        # Data file paths
        self.tests_file = os.path.join(self.data_dir, "tests.json")
        self.users_file = os.path.join(self.data_dir, "users.json")
        self.results_file = os.path.join(self.data_dir, "results.json")
        self.admins_file = os.path.join(self.data_dir, "admins.json")

        # Initialize data files
        self.initialize_data_files()

    def ensure_data_directory(self):
        """Ensure data directory exists"""
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)

    def initialize_data_files(self):
        """Initialize JSON data files if they don't exist"""
        default_data = {
            self.tests_file: {},
            self.users_file: {},
            self.results_file: [],
            self.admins_file: {
                "admin": {
                    "id": "admin",
                    "username": "admin",
                    "password_hash": "pbkdf2:sha256:260000$4xI8Q9v0RQKbF0Ky$8f1e2d3c4b5a6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0g1h2i3j4k5l6m7n8o9p0q1r2s3t4u5v6w7x8y9z0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
                    "created_at": datetime.now().isoformat(),
                    "role": "super_admin"
                }
            }
        }

        for file_path, default_content in default_data.items():
            if not os.path.exists(file_path):
                self.save_json(file_path, default_content)

    def load_json(self, file_path: str) -> Any:
        """Load JSON data from file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {} if file_path != self.results_file else []

    def save_json(self, file_path: str, data: Any) -> bool:
        """Save JSON data to file"""
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"Error saving JSON to {file_path}: {e}")
            return False

    # User Management
    def get_or_create_user(self, user_id: int, username: str) -> Dict:
        """Get existing user or create new one"""
        users = self.load_json(self.users_file)
        user_id_str = str(user_id)

        if user_id_str not in users:
            users[user_id_str] = {
                'id': user_id,
                'name': username,
                'username': username,
                'created_at': datetime.now().isoformat(),
                'last_seen': datetime.now().isoformat(),
                'tests_taken': 0
            }
        else:
            # Update last seen
            users[user_id_str]['last_seen'] = datetime.now().isoformat()

        self.save_json(self.users_file, users)
        return users[user_id_str]

    def get_user(self, user_id: int) -> Optional[Dict]:
        """Get user by ID"""
        users = self.load_json(self.users_file)
        return users.get(str(user_id))

    # Test Management
    def generate_test_code(self) -> str:
        """Generate unique 6-digit test code"""
        tests = self.load_json(self.tests_file)

        while True:
            code = ''.join(random.choices(string.digits, k=6))
            if code not in tests:
                return code

    def create_test(self, test_data: Dict) -> bool:
        """Create a new test"""
        tests = self.load_json(self.tests_file)
        tests[test_data['code']] = test_data
        return self.save_json(self.tests_file, tests)

    def get_test_by_code(self, code: str) -> Optional[Dict]:
        """Get test by code"""
        tests = self.load_json(self.tests_file)
        return tests.get(code)

    def get_all_tests(self) -> List[Dict]:
        """Get all tests"""
        tests = self.load_json(self.tests_file)
        return list(tests.values())

    def toggle_test_status(self, code: str) -> bool:
        """Toggle test active status"""
        tests = self.load_json(self.tests_file)
        if code in tests:
            tests[code]['active'] = not tests[code].get('active', False)
            return self.save_json(self.tests_file, tests)
        return False

    def delete_test(self, code: str) -> bool:
        """Delete test"""
        tests = self.load_json(self.tests_file)
        if code in tests:
            del tests[code]
            return self.save_json(self.tests_file, tests)
        return False

    # Answer Scoring
    def calculate_score(self, test: Dict, answers: Dict) -> float:
        """Calculate test score based on answers"""
        if not test.get('answer_key') or not answers:
            return 0.0

        answer_key = test['answer_key']
        total_questions = len(answer_key)
        correct_answers = 0

        for question_num, correct_answer in answer_key.items():
            user_answer = answers.get(question_num, '').strip().upper()

            # Handle different question types
            if isinstance(correct_answer, dict):
                # Text questions with parts A and B
                if 'A' in correct_answer and 'B' in correct_answer:
                    user_a = answers.get(f"{question_num}A", '').strip().upper()
                    user_b = answers.get(f"{question_num}B", '').strip().upper()
                    correct_a = str(correct_answer['A']).upper()
                    correct_b = str(correct_answer['B']).upper()

                    if user_a == correct_a and user_b == correct_b:
                        correct_answers += 1
            else:
                # Multiple choice questions
                correct_answer_str = str(correct_answer).upper()
                if user_answer == correct_answer_str:
                    correct_answers += 1

        return (correct_answers / total_questions) * 100 if total_questions > 0 else 0.0

    # Results Management
    def save_test_result(self, user_id: int, test_code: str, answers: Dict, score: float) -> str:
        """Save test result"""
        results = self.load_json(self.results_file)

        result = {
            'id': f"{user_id}_{test_code}_{int(datetime.now().timestamp())}",
            'user_id': user_id,
            'test_code': test_code,
            'answers': answers,
            'score': score,
            'submitted_at': datetime.now().isoformat()
        }

        results.append(result)
        self.save_json(self.results_file, results)

        # Update user test count
        users = self.load_json(self.users_file)
        user_id_str = str(user_id)
        if user_id_str in users:
            users[user_id_str]['tests_taken'] += 1
            self.save_json(self.users_file, users)

        return result['id']

    def get_user_results(self, user_id: int, limit: int = None) -> List[Dict]:
        """Get results for a specific user"""
        results = self.load_json(self.results_file)
        user_results = [r for r in results if r['user_id'] == user_id]
        user_results.sort(key=lambda x: x['submitted_at'], reverse=True)

        if limit:
            user_results = user_results[:limit]

        return user_results

    def get_results_by_test(self, test_code: str) -> List[Dict]:
        """Get all results for a specific test"""
        results = self.load_json(self.results_file)
        return [r for r in results if r['test_code'] == test_code]

    def get_all_results(self) -> List[Dict]:
        """Get all results"""
        results = self.load_json(self.results_file)
        results.sort(key=lambda x: x['submitted_at'], reverse=True)
        return results

    def get_recent_results(self, limit: int = 10) -> List[Dict]:
        """Get recent results with user and test details"""
        results = self.load_json(self.results_file)
        users = self.load_json(self.users_file)
        tests = self.load_json(self.tests_file)

        recent = sorted(results, key=lambda x: x['submitted_at'], reverse=True)[:limit]

        # Enrich with user and test data
        for result in recent:
            user = users.get(str(result['user_id']), {})
            test = tests.get(result['test_code'], {})
            result['user_name'] = user.get('name', 'Unknown')
            result['test_title'] = test.get('title', 'Unknown Test')

        return recent

    # Statistics
    def get_dashboard_stats(self) -> Dict:
        """Get dashboard statistics"""
        tests = self.load_json(self.tests_file)
        users = self.load_json(self.users_file)
        results = self.load_json(self.results_file)

        active_tests = len([t for t in tests.values() if t.get('active', False)])
        total_users = len(users)
        total_submissions = len(results)

        # Calculate average score
        if results:
            avg_score = sum(r['score'] for r in results) / len(results)
        else:
            avg_score = 0

        return {
            'total_tests': len(tests),
            'active_tests': active_tests,
            'total_users': total_users,
            'total_submissions': total_submissions,
            'average_score': round(avg_score, 1)
        }

    def get_detailed_stats(self) -> Dict:
        """Get detailed statistics for charts"""
        results = self.load_json(self.results_file)
        tests = self.load_json(self.tests_file)

        # Score distribution
        score_ranges = {'0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0}
        for result in results:
            score = result['score']
            if score <= 20:
                score_ranges['0-20'] += 1
            elif score <= 40:
                score_ranges['21-40'] += 1
            elif score <= 60:
                score_ranges['41-60'] += 1
            elif score <= 80:
                score_ranges['61-80'] += 1
            else:
                score_ranges['81-100'] += 1

        # Test popularity
        test_counts = {}
        for result in results:
            test_code = result['test_code']
            test_title = tests.get(test_code, {}).get('title', f'Test {test_code}')
            test_counts[test_title] = test_counts.get(test_title, 0) + 1

        return {
            'score_distribution': score_ranges,
            'test_popularity': test_counts
        }

    # Admin Management
    def get_admin(self, username: str) -> Optional[Dict]:
        """Get admin by username"""
        admins = self.load_json(self.admins_file)
        return admins.get(username)
