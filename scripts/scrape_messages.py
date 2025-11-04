import sys
import os

# 强制输出不缓冲，确保实时输出
os.environ['PYTHONUNBUFFERED'] = '1'
sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
sys.stderr.reconfigure(encoding='utf-8', line_buffering=True)

from telethon import TelegramClient, events, functions, types
import csv
from datetime import datetime
import asyncio
import os
import json
import logging
from pathlib import Path
import argparse
import random
from config import (
    API_ID,
    API_HASH,
    MEDIA_DIR,
    PROXY_CONFIGS
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('telegram_scraper.log', encoding='utf-8')
    ]
)

# Helper function for JSON output with forced flush
def print_json(data, file=sys.stdout):
    """Print JSON with forced flush for real-time streaming"""
    print(json.dumps(data), flush=True, file=file)

# Disable telethon's detailed logging
logging.getLogger('telethon').setLevel(logging.WARNING)

# Configure paths
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'scraped_data')
SESSIONS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'sessions')

def get_user_sessions_dir(user_email):
    return os.path.join(SESSIONS_DIR, user_email)

# Create necessary directories
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(SESSIONS_DIR, exist_ok=True)

def sanitize_filename(filename):
    """Clean filename, remove illegal characters"""
    return "".join(c for c in filename if c.isalnum() or c in (' ', '-', '_', '.'))

async def download_media(message, group_folder):
    """Download media files"""
    try:
        if message.media:
            media_folder = os.path.join(group_folder, 'media')
            os.makedirs(media_folder, exist_ok=True)
            
            # Get media type and filename
            if hasattr(message.media, 'photo'):
                # Handle photos
                file_name = f"photo_{message.id}.jpg"
                media_type = "photo"
            elif hasattr(message.media, 'document'):
                # Handle documents
                if message.sticker:
                    file_name = f"sticker_{message.id}.webp"
                    media_type = "sticker"
                    # 只为贴纸保存额外信息
                    document = message.media.document
                    sticker_info = {
                        'id': document.id,
                        'access_hash': document.access_hash,
                        'file_reference': document.file_reference.hex()
                    }
                    # 保存sticker信息到json文件
                    json_file_name = f"sticker_{message.id}.json"
                    json_file_path = os.path.join(media_folder, json_file_name)
                    with open(json_file_path, 'w', encoding='utf-8') as f:
                        json.dump(sticker_info, f, indent=2)
                elif message.video:
                    file_name = f"video_{message.id}.mp4"
                    media_type = "video"
                elif message.voice:
                    file_name = f"voice_{message.id}.ogg"
                    media_type = "voice"
                elif message.audio:
                    extension = message.audio.mime_type.split('/')[-1]
                    file_name = f"audio_{message.id}.{extension}"
                    media_type = "audio"
                else:
                    # Generic document
                    original_name = getattr(message.document, 'file_name', '')
                    extension = original_name.split('.')[-1] if original_name and '.' in original_name else 'bin'
                    file_name = f"doc_{message.id}.{extension}"
                    media_type = "document"
            else:
                return None
                
            # Clean filename
            file_name = sanitize_filename(file_name)
            file_path = os.path.join(media_folder, file_name)
            
            try:
                # Download using the message object directly
                await message.download_media(file_path)
                # 返回相对于group_folder的路径，使用media/作为前缀
                return f"media/{file_name}"
            except Exception as e:
                # If direct download fails, try alternative method
                try:
                    if hasattr(message.media, 'photo'):
                        # For photos, get the largest size
                        photo = message.photo
                        if photo:
                            await message.client.download_media(photo, file_path)
                            return f"media/{file_name}"
                    elif hasattr(message.media, 'document'):
                        # For documents, use document attribute
                        document = message.media.document
                        if document:
                            await message.client.download_media(document, file_path)
                            return f"media/{file_name}"
                except Exception as inner_e:
                    logging.error(f"Alternative download method failed: {str(inner_e)}")
                    
    except Exception as e:
        logging.error(f"Failed to download media: {str(e)}")
    return None

async def get_message_content(message):
    """Get message content and type"""
    if message.media:
        if hasattr(message.media, 'document'):
            # Check if it's a sticker
            if message.sticker:
                return f"[STICKER] {message.file.id}", "sticker"
            return f"[FILE] {message.file.name if message.file.name else 'Unnamed file'}", "file"
        elif hasattr(message.media, 'photo'):
            return "[PHOTO]", "photo"
        elif hasattr(message.media, 'video'):
            return "[VIDEO]", "video"
        else:
            return "[OTHER MEDIA]", "media"
    else:
        return message.text, "text"

async def connect_with_session(session_file, user_email):
    """Connect to Telegram using session file with retry mechanism"""
    MAX_RETRIES = 3
    RETRY_DELAY = 5  # seconds
    
    for attempt in range(MAX_RETRIES):
        try:
            # Select a random proxy from the list
            proxy_config = random.choice(PROXY_CONFIGS) if PROXY_CONFIGS else None
            
            client = TelegramClient(
                session_file,
                API_ID,
                API_HASH,
                proxy=proxy_config,
                connection_retries=3,
                retry_delay=3,
                timeout=300,  # 增加到 300 秒
                request_retries=3
            )
            
            await client.connect()
            
            if not await client.is_user_authorized():
                print(json.dumps({
                    "type": "error",
                    "message": "Session is not authorized"
                }), flush=True)
                return None
                
            print(json.dumps({
                "type": "info",
                "message": "Successfully connected"
            }), flush=True)
            return client
            
        except Exception as e:
            error_msg = str(e)
            if attempt < MAX_RETRIES - 1:
                print(json.dumps({
                    "type": "info",
                    "message": f"Connection attempt {attempt + 1} failed, retrying in {RETRY_DELAY} seconds... Error: {error_msg}"
                }))
                await asyncio.sleep(RETRY_DELAY)
                continue
            
            print(json.dumps({
                "type": "error",
                "message": f"Failed to connect with session {session_file}: {error_msg}"
            }), file=sys.stderr)
            return None
    
    print(json.dumps({
        "type": "error",
        "message": f"All connection attempts failed after {MAX_RETRIES} retries"
    }), file=sys.stderr)
    return None

async def scrape_group(client, group_username, message_limit=1000, user_email=None, topic_id=None, skip_media=False):
    """Scrape messages from a group with progress updates"""
    try:
        # Get the input entity with retry
        MAX_RETRIES = 3
        RETRY_DELAY = 5
        entity = None
        
        for attempt in range(MAX_RETRIES):
            try:
                entity = await client.get_input_entity(group_username)
                break
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    print_json({
                        "type": "info",
                        "message": f"Failed to get entity, attempt {attempt + 1}/{MAX_RETRIES}. Retrying in {RETRY_DELAY} seconds..."
                    })
                    await asyncio.sleep(RETRY_DELAY)
                else:
                    raise e
        
        if not entity:
            raise Exception("Failed to get group entity after all retries")
            
        # Create necessary directories
        group_folder = os.path.join(DATA_DIR, user_email, sanitize_filename(group_username))
        os.makedirs(group_folder, exist_ok=True)
        
        # CSV file path with optional topic
        topic_suffix = f"_topic{topic_id}" if topic_id else ""
        csv_file = os.path.join(group_folder, f'{sanitize_filename(group_username)}_messages{topic_suffix}.csv')
        
        # Prepare iter_messages parameters
        iter_params = {'limit': message_limit}
        if topic_id:
            iter_params['reply_to'] = int(topic_id)
        
        topic_msg = f" (Topic ID: {topic_id})" if topic_id else ""
        media_msg = " (media will be skipped)" if skip_media else " (including media)"
        print_json({
            'type': 'info',
            'message': f'Scraping up to {message_limit} messages{topic_msg}{media_msg}'
        })
        
        # Get total message count with retry
        total_messages = 0
        for attempt in range(MAX_RETRIES):
            try:
                # 计算实际的总消息数
                async for msg in client.iter_messages(entity, **iter_params):
                    # Skip bot messages
                    if msg.sender and hasattr(msg.sender, 'bot') and msg.sender.bot:
                        continue
                    total_messages += 1
                break
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    print_json({
                        "type": "info",
                        "message": f"Failed to get message count, attempt {attempt + 1}/{MAX_RETRIES}. Retrying..."
                    })
                    await asyncio.sleep(RETRY_DELAY)
                else:
                    raise e
        
        # 使用目标消息数量作为total
        target_messages = total_messages
        
        print_json({
            'type': 'start',
            'total': target_messages
        })
        
        # 第一步：先抓取所有消息内容
        messages = []
        processed = 0
        last_progress = -1
        last_update_time = time.time()
        UPDATE_INTERVAL = 2  # 每2秒至少发送一次进度更新
        
        print_json({
            'type': 'info',
            'message': 'Fetching messages...'
        })
        
        async for message in client.iter_messages(entity, **iter_params):
            # Skip bot messages
            if message.sender and hasattr(message.sender, 'bot') and message.sender.bot:
                continue
                
            processed += 1
            progress = int((processed / target_messages) * 100) if target_messages > 0 else 0
            current_time = time.time()
            
            if progress != last_progress or (current_time - last_update_time) >= UPDATE_INTERVAL:
                print_json({
                    'type': 'progress',
                    'current': processed,
                    'total': target_messages,
                    'percentage': progress
                })
                last_progress = progress
                last_update_time = current_time
            
            try:
                content, msg_type = await get_message_content(message)
                messages.append({
                    'id': message.id,
                    'date': message.date.isoformat(),
                    'type': msg_type,
                    'content': content,
                    'media_file': ''  # Will be filled if media is downloaded
                })
            except Exception as e:
                print_json({
                    'type': 'warning',
                    'message': f'Error processing message {message.id}: {str(e)}'
                })
                continue
        
        # 写入消息到CSV
        print_json({
            'type': 'info',
            'message': 'Writing messages to CSV file...'
        })
        
        with open(csv_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['id', 'date', 'type', 'content', 'media_file'])
            writer.writeheader()
            writer.writerows(messages)
        
        # 如果不跳过媒体，则处理媒体文件
        if not skip_media:
            print_json({
                'type': 'info',
                'message': 'Step 2: Processing media files...'
            })
            
            media_messages = [msg for msg in messages if msg['type'] in ['photo', 'video', 'sticker', 'file']]
            for i, msg in enumerate(media_messages, 1):
                try:
                    print_json({
                        'type': 'progress',
                        'current': i,
                        'total': len(media_messages),
                        'percentage': int((i / len(media_messages)) * 100),
                        'message': f'Processing media file {i}/{len(media_messages)}'
                    })
                    
                    msg_obj = await client.get_messages(entity, ids=msg['id'])
                    if msg_obj and msg_obj.media:
                        media_folder = os.path.join(group_folder, 'media')
                        os.makedirs(media_folder, exist_ok=True)
                        media_path = await download_media(msg_obj, group_folder)
                        if media_path:
                            msg['media_file'] = media_path
                except Exception as e:
                    print_json({
                        'type': 'warning',
                        'message': f'Failed to process media for message {msg["id"]}: {str(e)}'
                    })
            
            # 更新CSV中的媒体文件路径
            print_json({
                'type': 'info',
                'message': 'Updating CSV with media file paths...'
            })
            
            with open(csv_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=['id', 'date', 'type', 'content', 'media_file'])
                writer.writeheader()
                writer.writerows(messages)
        
        # 发送完成结果（无论是否跳过媒体）
        media_count = 0 if skip_media else len([msg for msg in messages if msg.get('media_file')])
        print_json({
            'type': 'result',
            'data': {
                'group': group_username,
                'totalMessages': len(messages),
                'mediaFiles': media_count,
                'csvFile': csv_file,
                'folderPath': group_folder
            }
        })
        
        # 发送完成消息
        media_status = ' (media skipped)' if skip_media else ''
        print_json({
            'type': 'complete',
            'message': f'Successfully scraped messages{media_status}',
            'csv_file': csv_file
        })
        
    except Exception as e:
        print_json({
            'type': 'error',
            'message': str(e)
        }, file=sys.stderr)
        raise e

async def scrape_group_by_date_range(client, group_username, start_date, end_date, user_email=None, topic_id=None, skip_media=True):
    """Scrape messages from a group within a date range with progress updates"""
    try:
        # Get the input entity with retry
        MAX_RETRIES = 3
        RETRY_DELAY = 5
        entity = None
        
        for attempt in range(MAX_RETRIES):
            try:
                entity = await client.get_input_entity(group_username)
                break
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    print(json.dumps({
                        "type": "info",
                        "message": f"Failed to get entity, attempt {attempt + 1}/{MAX_RETRIES}. Retrying in {RETRY_DELAY} seconds..."
                    }))
                    await asyncio.sleep(RETRY_DELAY)
                else:
                    raise e
        
        if not entity:
            raise Exception("Failed to get group entity after all retries")
            
        # Create necessary directories
        group_folder = os.path.join(DATA_DIR, user_email, sanitize_filename(group_username))
        os.makedirs(group_folder, exist_ok=True)
        
        # CSV file path with date range and optional topic
        date_str = f"{start_date.strftime('%Y%m%d')}_to_{end_date.strftime('%Y%m%d')}"
        topic_suffix = f"_topic{topic_id}" if topic_id else ""
        csv_file = os.path.join(group_folder, f'{sanitize_filename(group_username)}_messages_{date_str}{topic_suffix}.csv')
        
        topic_msg = f" (Topic ID: {topic_id})" if topic_id else ""
        media_msg = " (media will be skipped)" if skip_media else " (including media)"
        print_json({
            'type': 'info',
            'message': f'Scraping messages from {start_date} to {end_date}{topic_msg}{media_msg}'
        })
        
        # 第一步：先计算消息总数
        print_json({
            'type': 'info',
            'message': 'Counting messages in date range...'
        })
        
        # Prepare iter_messages parameters
        iter_params = {'offset_date': start_date, 'reverse': True}
        if topic_id:
            iter_params['reply_to'] = int(topic_id)
        
        total_messages = 0
        async for message in client.iter_messages(entity, **iter_params):
            if message.date > end_date:
                break
            # Skip bot messages
            if message.sender and hasattr(message.sender, 'bot') and message.sender.bot:
                continue
            total_messages += 1
            if total_messages % 100 == 0:  # 每100条更新一次计数
                print_json({
                    'type': 'info',
                    'message': f'Counted {total_messages} messages so far...'
                })
        
        print_json({
            'type': 'start',
            'total': total_messages
        })
        
        # 第二步：抓取所有消息内容
        messages = []
        processed = 0
        last_progress = -1
        last_update_time = time.time()
        UPDATE_INTERVAL = 2  # 每2秒至少发送一次进度更新
        
        print_json({
            'type': 'info',
            'message': 'Fetching messages...'
        })
        
        async for message in client.iter_messages(entity, **iter_params):
            if message.date > end_date:
                break
            
            # Skip bot messages
            if message.sender and hasattr(message.sender, 'bot') and message.sender.bot:
                continue
                
            processed += 1
            progress = int((processed / total_messages) * 100) if total_messages > 0 else 0
            current_time = time.time()
            
            if progress != last_progress or (current_time - last_update_time) >= UPDATE_INTERVAL:
                print_json({
                    'type': 'progress',
                    'current': processed,
                    'total': total_messages,
                    'percentage': progress
                })
                last_progress = progress
                last_update_time = current_time
            
            try:
                content, msg_type = await get_message_content(message)
                
                # 获取发送者的username
                username = ''
                if message.sender:
                    if hasattr(message.sender, 'username') and message.sender.username:
                        username = message.sender.username
                    elif hasattr(message.sender, 'first_name'):
                        username = message.sender.first_name or ''
                        if hasattr(message.sender, 'last_name') and message.sender.last_name:
                            username += f' {message.sender.last_name}'
                
                # 生成消息链接
                message_link = ''
                try:
                    # 获取chat信息以构建链接
                    chat = await client.get_entity(entity)
                    if hasattr(chat, 'username') and chat.username:
                        # 公开群组/频道
                        message_link = f'https://t.me/{chat.username}/{message.id}'
                    else:
                        # 私有群组/频道
                        # 对于私有频道，使用 chat_id（去掉-100前缀）
                        chat_id = str(chat.id)
                        if chat_id.startswith('-100'):
                            chat_id = chat_id[4:]  # 去掉 -100 前缀
                        message_link = f'https://t.me/c/{chat_id}/{message.id}'
                except:
                    message_link = f'Message ID: {message.id}'
                
                messages.append({
                    'id': message.id,
                    'date': message.date.isoformat(),
                    'type': msg_type,
                    'content': content,
                    'username': username,
                    'message_link': message_link,
                    'media_file': ''  # Will be filled if media is downloaded
                })
            except Exception as e:
                print_json({
                    'type': 'warning',
                    'message': f'Error processing message {message.id}: {str(e)}'
                })
                continue
        
        # 写入消息到CSV
        print_json({
            'type': 'info',
            'message': 'Writing messages to CSV file...'
        })
        
        with open(csv_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['id', 'date', 'type', 'content', 'username', 'message_link', 'media_file'])
            writer.writeheader()
            writer.writerows(messages)
        
        # 如果不跳过媒体，则处理媒体文件
        if not skip_media:
            print_json({
                'type': 'info',
                'message': 'Step 2: Processing media files...'
            })
            
            # 处理媒体文件
            media_messages = [msg for msg in messages if msg['type'] in ['photo', 'video', 'sticker', 'file']]
            for i, msg in enumerate(media_messages, 1):
                try:
                    print_json({
                        'type': 'progress',
                        'current': i,
                        'total': len(media_messages),
                        'percentage': int((i / len(media_messages)) * 100),
                        'message': f'Processing media file {i}/{len(media_messages)}'
                    })
                    
                    # 获取原始消息对象
                    msg_obj = await client.get_messages(entity, ids=msg['id'])
                    if msg_obj and msg_obj.media:
                        media_folder = os.path.join(group_folder, 'media')
                        os.makedirs(media_folder, exist_ok=True)
                        media_path = await download_media(msg_obj, group_folder)
                        if media_path:
                            msg['media_file'] = media_path
                except Exception as e:
                    print_json({
                        'type': 'warning',
                        'message': f'Failed to process media for message {msg["id"]}: {str(e)}'
                    })
            
            # 更新CSV中的媒体文件路径
            print_json({
                'type': 'info',
                'message': 'Updating CSV with media file paths...'
            })
            
            with open(csv_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=['id', 'date', 'type', 'content', 'username', 'message_link', 'media_file'])
                writer.writeheader()
                writer.writerows(messages)
        
        # 发送完成结果（无论是否跳过媒体）
        media_count = 0 if skip_media else len([msg for msg in messages if msg.get('media_file')])
        print_json({
            'type': 'result',
            'data': {
                'group': group_username,
                'totalMessages': len(messages),
                'mediaFiles': media_count,
                'csvFile': csv_file,
                'folderPath': group_folder
            }
        })
        
        # 发送完成消息
        media_status = ' (media skipped)' if skip_media else ''
        print_json({
            'type': 'complete',
            'message': f'Successfully scraped messages{media_status}',
            'csv_file': csv_file
        })
        
    except Exception as e:
        print_json({
            'type': 'error',
            'message': str(e)
        }, file=sys.stderr)
        raise e

async def main():
    parser = argparse.ArgumentParser(description='Scrape messages from Telegram group')
    parser.add_argument('--session', required=True, help='Path to session file')
    parser.add_argument('--group', required=True, help='Group username or ID')
    parser.add_argument('--limit', type=int, default=1000, help='Maximum number of messages to scrape')
    parser.add_argument('--user-email', required=True, help='User email for organizing data')
    parser.add_argument('--timeout', type=int, default=90, help='Timeout in seconds')
    parser.add_argument('--start-date', help='Start date for date range scraping (YYYY-MM-DD)')
    parser.add_argument('--end-date', help='End date for date range scraping (YYYY-MM-DD)')
    parser.add_argument('--topic-id', help='Topic ID for topic groups (optional)')
    parser.add_argument('--skip-media', action='store_true', help='Skip media download (only text messages)')
    
    args = parser.parse_args()
    
    try:
        client = await connect_with_session(args.session, args.user_email)
        
        # 如果提供了日期范围参数，使用日期范围抓取
        if args.start_date and args.end_date:
            from datetime import datetime, timezone
            # 将日期字符串转换为UTC时区的datetime对象
            start_date = datetime.strptime(args.start_date, '%Y-%m-%d').replace(tzinfo=timezone.utc)
            end_date = datetime.strptime(args.end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
            topic_id = args.topic_id if args.topic_id else None
            skip_media = args.skip_media  # 从参数获取
            await scrape_group_by_date_range(client, args.group, start_date, end_date, args.user_email, topic_id, skip_media)
        else:
            # 否则使用原来的limit方式
            topic_id = args.topic_id if args.topic_id else None
            skip_media = args.skip_media  # 从参数获取
            await scrape_group(client, args.group, args.limit, args.user_email, topic_id, skip_media)
    except Exception as e:
        logging.error(f"Error: {str(e)}")
        sys.exit(1)
    finally:
        try:
            await client.disconnect()
        except:
            pass

if __name__ == "__main__":
    import sys
    import os
    import time
    
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(main())
