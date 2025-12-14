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

# Proxy configurations - 支持从环境变量读取
def parse_proxy_configs():
    """
    从环境变量解析代理配置
    环境变量格式: PROXY_CONFIGS=socks5://username:password@addr:port,socks5://username:password@addr:port
    例如: PROXY_CONFIGS=socks5://zhouhaha:963091790@102.177.147.43:50101,socks5://zhouhaha:963091790@102.177.146.2:50101
    """
    proxy_env = os.environ.get('PROXY_CONFIGS', '')
    
    if proxy_env:
        proxies = []
        for proxy_str in proxy_env.split(','):
            proxy_str = proxy_str.strip()
            if proxy_str:
                try:
                    # 解析格式: socks5://username:password@addr:port
                    from urllib.parse import urlparse
                    parsed = urlparse(proxy_str)
                    proxies.append({
                        'proxy_type': parsed.scheme,
                        'addr': parsed.hostname,
                        'port': parsed.port,
                        'username': parsed.username,
                        'password': parsed.password
                    })
                except Exception as e:
                    print(f"Warning: Failed to parse proxy config '{proxy_str}': {e}")
        
        if proxies:
            return proxies
    
    # 默认配置（fallback）
    return [
        {
            'proxy_type': 'socks5',
            'addr': '104.219.170.216',
            'port': 50101,
            'username': 'zhouyunhua0628',
            'password': 'pzBLnbDWjs'
        }
    ]

PROXY_CONFIGS = parse_proxy_configs()

# Default proxy configuration (used by session_gen.py)
DEFAULT_PROXY = PROXY_CONFIGS[0] if PROXY_CONFIGS else None


