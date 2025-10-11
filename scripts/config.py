"""
Configuration file for Telegram bot scripts
"""
import os

# Constants
import dotenv
from pathlib import Path

# 加载环境变量
dotenv.load_dotenv()

# Telegram API credentials - 从环境变量读取
API_ID = int(os.environ.get('API_ID', '22453265'))
API_HASH = os.environ.get('API_HASH', '641c3fad1c94728381a70113c70cd52d')

# 获取项目根目录（默认为当前脚本所在目录的父目录）
ROOT_DIR = os.environ.get('PROJECT_ROOT', os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))) 

# 使用相对路径并支持环境变量覆盖
BASE_SESSIONS_DIR = os.environ.get('SESSIONS_DIR', os.path.join(ROOT_DIR, 'sessions'))
MEDIA_DIR = os.environ.get('MEDIA_DIR', os.path.join(ROOT_DIR, 'scraped_data'))

def get_user_sessions_dir(user_email):
    """获取用户特定的sessions目录"""
    sessions_dir = os.path.join(BASE_SESSIONS_DIR, user_email)
    # 确保目录存在
    os.makedirs(sessions_dir, exist_ok=True)
    return sessions_dir

# Emoji list for reactions
REACTION_EMOJIS = ['👍', '🔥', '🎉', '💯']

# Proxy configurations
PROXY_CONFIGS = [
    {
        'proxy_type': 'socks5',
        'addr': '102.177.147.43',
        'port': 50101,
        'username': 'zhouhaha',
        'password': '963091790'
    },
    {
        'proxy_type': 'socks5',
        'addr': '102.177.146.2',
        'port': 50101,
        'username': 'zhouhaha',
        'password': '963091790'
    },
]

# Default proxy configuration (used by session_gen.py)
DEFAULT_PROXY = PROXY_CONFIGS[0]


