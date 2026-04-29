import time
import logging
import sys
from datetime import datetime
from pathlib import Path
from fastapi import Request
from typing import Callable


BASE_DIR = Path(__file__).parent.parent
LOGS_DIR = BASE_DIR / "logs"


def setup_logger():
    logger = logging.getLogger("student_api")
    if logger.handlers:
        return logger
    logger.setLevel(logging.INFO)
    logger.propagate = False

    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)
    logger.addHandler(console_handler)

    if LOGS_DIR.exists() and LOGS_DIR.is_dir():
        try:
            api_log_path = LOGS_DIR / "api.log"
            file_handler = logging.FileHandler(
                api_log_path,
                mode='a',
                encoding='utf-8'
            )
            file_handler.setFormatter(formatter)
            file_handler.setLevel(logging.INFO)
            logger.addHandler(file_handler)

            errors_log_path = LOGS_DIR / "errors.log"
            error_handler = logging.FileHandler(
                errors_log_path,
                mode='a',
                encoding='utf-8'
            )
            error_handler.setFormatter(formatter)
            error_handler.setLevel(logging.ERROR)
            logger.addHandler(error_handler)

        except Exception as e:
            print(f"⚠️ Не удалось создать файловые обработчики: {e}")
            print("ℹ️ Будут работать только консольные логи")
    else:
        print(f"⚠️ Папка 'logs' не найдена: {LOGS_DIR.absolute()}")
        print("ℹ️ Будут работать только консольные логи")

    return logger


logger = setup_logger()

async def logging_middleware(request: Request, call_next):
    request_id = datetime.now().strftime("%Y%m%d_%H%M%S_") + str(int(time.time() * 1000))[-6:]

    start_time = time.time()

    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    method = request.method
    url = str(request.url)

    url_without_query = str(request.url).split('?')[0]

    logger.info(
        f"▶️ ВХОДЯЩИЙ ЗАПРОС | "
        f"ID: {request_id} | "
        f"Метод: {method} | "
        f"Путь: {url_without_query} | "
        f"IP: {client_ip} | "
        f"User-Agent: {user_agent[:30]}..."
    )

    try:
        response = await call_next(request)

        process_time = time.time() - start_time

        logger.info(
            f"✅ УСПЕШНЫЙ ОТВЕТ | "
            f"ID: {request_id} | "
            f"Статус: {response.status_code} | "
            f"Время: {process_time:.3f}с | "
            f"Метод: {method} | "
            f"Путь: {url_without_query}"
        )
        response.headers["X-Request-ID"] = request_id

        return response

    except Exception as e:
        process_time = time.time() - start_time

        logger.error(
            f"❌ ОШИБКА | "
            f"ID: {request_id} | "
            f"Метод: {method} | "
            f"Путь: {url_without_query} | "
            f"Тип ошибки: {type(e).__name__} | "
            f"Сообщение: {str(e)[:100]}... | "
            f"Время до ошибки: {process_time:.3f}с",
            exc_info=True  # Добавляет полный traceback в лог
        )
        raise


