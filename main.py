#!/usr/bin/env python3
"""
Main entry point for the Telegram Bot Web App
Runs both the Telegram bot and Flask web server
"""

import asyncio
import threading
import os
import logging
from bot import start_bot
from web_app import create_app

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_flask_app():
    """Run the Flask web application in a separate thread"""
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)


async def main():
    """Main function to start both bot and web app"""
    logger.info("Starting Telegram Bot Web App...")

    # Start Flask app in a separate thread
    flask_thread = threading.Thread(target=run_flask_app, daemon=True)
    flask_thread.start()
    logger.info("Flask web app started on port 5000")

    # Start the Telegram bot
    await start_bot()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Application stopped by user")
    except Exception as e:
        logger.error(f"Application error: {e}")
