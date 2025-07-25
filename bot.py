"""
Telegram Bot implementation using aiogram 3
Handles user interactions and web app integration
"""

import asyncio
import logging
import os
import json
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from data_manager import DataManager

# Configure logging
logger = logging.getLogger(__name__)

# Bot token from environment
BOT_TOKEN = os.getenv("BOT_TOKEN", "")

# Initialize bot and dispatcher (only if token is provided)
bot = None
dp = None
storage = None
data_manager = DataManager()

if BOT_TOKEN and BOT_TOKEN != "your_bot_token_here":
    try:
        bot = Bot(token=BOT_TOKEN)
        storage = MemoryStorage()
        dp = Dispatcher(storage=storage)
        logger.info("Bot initialized successfully")
    except Exception as e:
        logger.warning(f"Failed to initialize bot: {e}")


class TestStates(StatesGroup):
    waiting_for_code = State()


def register_handlers():
    """Register bot handlers"""
    if not dp or not bot:
        logger.warning("Bot not initialized, skipping handler registration")
        return

    @dp.message(Command("start"))
    async def start_command(message: types.Message, state: FSMContext):
        """Handle /start command"""
        user_id = message.from_user.id
        username = message.from_user.username or message.from_user.first_name

        # Register or update user
        user_data = data_manager.get_or_create_user(user_id, username)

        welcome_text = f"🎓 Welcome to the Test System, {user_data['name']}!\n\n"
        welcome_text += "📝 To take a test, please enter your test code.\n"
        welcome_text += "🌐 Or use the Web App for a better experience!"

        # Create inline keyboard with web app button
        webapp_url = f"https://{os.getenv('REPLIT_DOMAINS', 'localhost:5000')}/webapp?user_id={user_id}"
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text="📱 Open Web App",
                web_app=WebAppInfo(url=webapp_url)
            )],
            [InlineKeyboardButton(
                text="💻 Enter Test Code",
                callback_data="enter_code"
            )]
        ])

        await message.answer(welcome_text, reply_markup=keyboard)

    @dp.callback_query(F.data == "enter_code")
    async def enter_code_callback(callback: types.CallbackQuery, state: FSMContext):
        """Handle enter code button"""
        await callback.answer()
        await callback.message.answer(
            "📝 Please enter your 6-digit test code:",
            reply_markup=types.ReplyKeyboardRemove()
        )
        await state.set_state(TestStates.waiting_for_code)

    @dp.message(StateFilter(TestStates.waiting_for_code))
    async def process_test_code(message: types.Message, state: FSMContext):
        """Process entered test code"""
        code = message.text.strip().upper()

        if not code.isdigit() or len(code) != 6:
            await message.answer(
                "❌ Invalid code format. Please enter a 6-digit test code:"
            )
            return

        # Check if test exists and is active
        test = data_manager.get_test_by_code(code)
        if not test:
            await message.answer(
                "❌ Test code not found. Please check your code and try again:"
            )
            return

        if not test.get('active', False):
            await message.answer(
                "❌ This test is not currently active. Please contact your instructor."
            )
            await state.clear()
            return

        # Store test code in state and redirect to web app
        await state.update_data(test_code=code)

        user_id = message.from_user.id
        webapp_url = f"https://{os.getenv('REPLIT_DOMAINS', 'localhost:5000')}/webapp?user_id={user_id}&test_code={code}"

        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text="🚀 Start Test",
                web_app=WebAppInfo(url=webapp_url)
            )]
        ])

        await message.answer(
            f"✅ Test found: {test['title']}\n"
            f"📋 Questions: {test['total_questions']}\n"
            f"⏱️ Time limit: {test.get('time_limit', 'No limit')}\n\n"
            f"Click the button below to start your test:",
            reply_markup=keyboard
        )
        await state.clear()

    @dp.message(Command("help"))
    async def help_command(message: types.Message):
        """Handle /help command"""
        help_text = """
🎓 **Test System Help**

**Commands:**
• /start - Start the bot and access tests
• /help - Show this help message
• /status - Check your recent test results

**How to take a test:**
1. Get a test code from your instructor
2. Use /start command
3. Enter your test code or use the Web App
4. Complete the test questions
5. Submit and view your results

**Question Types:**
• Questions 1-32: Multiple choice (A/B/C/D)
• Questions 33-35: Multiple choice (A/B/C/D/E/F)
• Questions 36-45: Text input (Parts A and B)

**Need help?** Contact your instructor or administrator.
        """
        await message.answer(help_text, parse_mode="Markdown")

    @dp.message(Command("status"))
    async def status_command(message: types.Message):
        """Handle /status command - show recent test results"""
        user_id = message.from_user.id
        results = data_manager.get_user_results(user_id, limit=5)

        if not results:
            await message.answer("📊 No test results found.")
            return

        status_text = "📊 **Your Recent Test Results:**\n\n"
        for result in results:
            test = data_manager.get_test_by_code(result['test_code'])
            test_title = test['title'] if test else f"Test {result['test_code']}"

            status_text += f"📝 **{test_title}**\n"
            status_text += f"• Score: {result['score']:.1f}%\n"
            status_text += f"• Date: {result['submitted_at'][:10]}\n"
            status_text += f"• Code: {result['test_code']}\n\n"

        await message.answer(status_text, parse_mode="Markdown")

    @dp.message()
    async def handle_unknown_message(message: types.Message):
        """Handle unknown messages"""
        await message.answer(
            "🤔 I don't understand that command.\n"
            "Use /start to begin or /help for assistance."
        )


async def start_bot():
    """Start the bot"""
    if not bot or not dp:
        logger.warning("Bot not initialized, cannot start")
        return

    logger.info("Starting Telegram bot...")
    try:
        # Register handlers
        register_handlers()

        # Start polling
        await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"Bot error: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(start_bot())
