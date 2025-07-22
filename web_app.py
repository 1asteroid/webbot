"""
Flask Web Application
Handles admin panel and student web app
"""

import os
import json
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from werkzeug.security import check_password_hash
from data_manager import DataManager
from auth import require_admin, login_required


def create_app():
    """Create and configure Flask application"""
    app = Flask(__name__)
    app.secret_key = os.getenv("SECRET_KEY", "your-secret-key-change-this")

    data_manager = DataManager()

    # Root route - redirect to admin login
    @app.route('/')
    def index():
        """Root route - redirect to admin panel"""
        return redirect(url_for('admin_login'))

    # Student Web App Routes
    @app.route('/webapp')
    def webapp():
        """Student web app interface"""
        user_id = request.args.get('user_id')
        test_code = request.args.get('test_code')

        if not user_id:
            return "Error: User ID required", 400

        # Get user data
        user_data = data_manager.get_user(int(user_id))
        if not user_data:
            return "Error: User not found", 404

        # If test code provided, validate it
        test_data = None
        if test_code:
            test_data = data_manager.get_test_by_code(test_code)
            if not test_data or not test_data.get('active'):
                return "Error: Invalid or inactive test code", 400

        return render_template('student_webapp.html',
                               user_data=user_data,
                               test_data=test_data)

    @app.route('/api/submit_test', methods=['POST'])
    def submit_test():
        """Handle test submission from web app"""
        try:
            data = request.get_json()
            user_id = int(data['user_id'])
            test_code = data['test_code']
            answers = data['answers']

            # Validate test
            test = data_manager.get_test_by_code(test_code)
            if not test or not test.get('active'):
                return jsonify({'error': 'Invalid test code'}), 400

            # Calculate score
            score = data_manager.calculate_score(test, answers)

            # Save result
            result_id = data_manager.save_test_result(user_id, test_code, answers, score)

            return jsonify({
                'success': True,
                'score': score,
                'result_id': result_id
            })

        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # Admin Routes
    @app.route('/admin')
    def admin_login():
        """Admin login page"""
        if 'admin_id' in session:
            return redirect(url_for('admin_dashboard'))
        return render_template('admin_login.html')

    @app.route('/admin/login', methods=['POST'])
    def admin_login_post():
        """Handle admin login"""
        username = request.form['username']
        password = request.form['password']

        admin = data_manager.get_admin(username)
        if admin and check_password_hash(admin['password_hash'], password):
            session['admin_id'] = admin['id']
            session['admin_username'] = admin['username']
            flash('Login successful!', 'success')
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Invalid credentials', 'error')
            return redirect(url_for('admin_login'))

    @app.route('/admin/logout')
    @login_required
    def admin_logout():
        """Handle admin logout"""
        session.clear()
        flash('Logged out successfully', 'info')
        return redirect(url_for('admin_login'))

    @app.route('/admin/dashboard')
    @require_admin
    def admin_dashboard():
        """Admin dashboard"""
        stats = data_manager.get_dashboard_stats()
        recent_results = data_manager.get_recent_results(limit=10)
        return render_template('admin_dashboard.html',
                               stats=stats,
                               recent_results=recent_results)

    @app.route('/admin/tests')
    @require_admin
    def admin_test_manage():
        """Test management page"""
        tests = data_manager.get_all_tests()
        return render_template('admin_test_manage.html', tests=tests)

    @app.route('/admin/tests/create')
    @require_admin
    def admin_test_create():
        """Test creation page"""
        return render_template('admin_test_create.html')

    @app.route('/admin/tests/create', methods=['POST'])
    @require_admin
    def admin_test_create_post():
        """Handle test creation"""
        try:
            data = request.get_json()

            # Generate unique test code
            test_code = data_manager.generate_test_code()

            test_data = {
                'code': test_code,
                'title': data['title'],
                'description': data.get('description', ''),
                'total_questions': len(data['answer_key']),
                'answer_key': data['answer_key'],
                'time_limit': data.get('time_limit'),
                'active': data.get('active', True),
                'created_at': datetime.now().isoformat(),
                'created_by': session['admin_username']
            }

            success = data_manager.create_test(test_data)
            if success:
                return jsonify({'success': True, 'test_code': test_code})
            else:
                return jsonify({'error': 'Failed to create test'}), 500

        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/admin/tests/<test_code>/toggle', methods=['POST'])
    @require_admin
    def admin_test_toggle(test_code):
        """Toggle test active status"""
        success = data_manager.toggle_test_status(test_code)
        if success:
            return jsonify({'success': True})
        return jsonify({'error': 'Test not found'}), 404

    @app.route('/admin/tests/<test_code>/delete', methods=['POST'])
    @require_admin
    def admin_test_delete(test_code):
        """Delete test"""
        success = data_manager.delete_test(test_code)
        if success:
            return jsonify({'success': True})
        return jsonify({'error': 'Test not found'}), 404

    @app.route('/admin/results')
    @require_admin
    def admin_results():
        """Results viewing page"""
        test_code = request.args.get('test_code')
        results = data_manager.get_results_by_test(test_code) if test_code else data_manager.get_all_results()
        tests = data_manager.get_all_tests()
        return render_template('admin_results.html', results=results, tests=tests, selected_test=test_code)

    @app.route('/admin/api/stats')
    @require_admin
    def admin_api_stats():
        """API endpoint for dashboard statistics"""
        stats = data_manager.get_detailed_stats()
        return jsonify(stats)

    @app.route('/admin/api/export/<test_code>')
    @require_admin
    def admin_api_export(test_code):
        """Export test results"""
        results = data_manager.get_results_by_test(test_code)
        return jsonify(results)

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host='0.0.0.1', port=5000, debug=True)
