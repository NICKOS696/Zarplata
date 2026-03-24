"""
Модуль для работы с аутентификацией и авторизацией
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db

# Настройки безопасности
SECRET_KEY = "your-secret-key-change-this-in-production"  # В продакшене использовать переменную окружения
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 часа

# HTTP Bearer для получения токена из заголовка
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверка пароля"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    """Хеширование пароля"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Создание JWT токена"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    # Добавляем company_id в токен если есть
    if "company_id" in data:
        to_encode["company_id"] = data["company_id"]
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def authenticate_user(db: Session, username: str, password: str) -> Optional[models.User]:
    """Аутентификация пользователя"""
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    if not user.is_active:
        return None
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> models.User:
    """Получение текущего пользователя из токена"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        # Извлекаем company_id из токена (для директора может меняться)
        token_company_id = payload.get("company_id")
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # Для директора может быть временный company_id из токена
    if user.role == 'director' and token_company_id:
        # Сохраняем временный company_id для фильтрации (не меняем в БД)
        user._temp_company_id = token_company_id
    
    return user


def require_role(allowed_roles: list):
    """Декоратор для проверки роли пользователя"""
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker


def get_company_id_from_header(request) -> Optional[int]:
    """Получить company_id из заголовка X-Company-ID"""
    company_id = request.headers.get('X-Company-ID')
    if company_id:
        try:
            return int(company_id)
        except (ValueError, TypeError):
            return None
    return None


def get_user_company_id(user: models.User, request=None) -> Optional[int]:
    """
    Получить company_id пользователя с учетом заголовка запроса
    
    - admin: company_id из заголовка X-Company-ID (обязательно)
    - director: company_id из заголовка X-Company-ID (обязательно)
    - analyst: company_id из БД (только своя компания)
    """
    if user.role in ['admin', 'director']:
        # Для admin и director используем company_id из заголовка
        if request:
            header_company_id = get_company_id_from_header(request)
            if header_company_id:
                return header_company_id
        # Fallback на _temp_company_id из токена
        return getattr(user, '_temp_company_id', None)
    
    # Для analyst и других ролей используем company_id из БД
    return user.company_id


def get_accessible_employee_ids(user: models.User, db: Session, request=None) -> list:
    """
    Получить список ID сотрудников, к которым у пользователя есть доступ
    
    - admin: все сотрудники выбранной компании
    - analyst: все сотрудники своей компании
    - director: все сотрудники выбранной компании
    - hr: все сотрудники своей компании (deprecated)
    - supervisor: только свои агенты + сам супервайзер (deprecated)
    - manager: свои супервайзеры + их агенты + сам менеджер (deprecated)
    """
    company_id = get_user_company_id(user, request)
    
    if user.role in ['admin', 'analyst', 'director']:
        # Доступ ко всем сотрудникам компании
        query = db.query(models.Employee)
        if company_id:
            query = query.filter(models.Employee.company_id == company_id)
        employees = query.all()
        return [emp.id for emp in employees]
    
    # Старые роли (для обратной совместимости)
    if user.role in ['hr']:
        # Полный доступ ко всем сотрудникам своей компании
        query = db.query(models.Employee)
        if company_id:
            query = query.filter(models.Employee.company_id == company_id)
        employees = query.all()
        return [emp.id for emp in employees]
    
    if user.role == 'supervisor':
        # Супервайзер: свои агенты + сам
        if not user.employee_id:
            return []
        
        # Находим всех агентов этого супервайзера
        agents = db.query(models.Employee).filter(
            models.Employee.supervisor_id == user.employee_id
        ).all()
        
        return [user.employee_id] + [agent.id for agent in agents]
    
    if user.role == 'manager':
        # Менеджер: свои супервайзеры + их агенты + сам
        if not user.employee_id:
            return []
        
        # Находим всех супервайзеров этого менеджера
        supervisors = db.query(models.Employee).filter(
            models.Employee.manager_id == user.employee_id
        ).all()
        supervisor_ids = [sup.id for sup in supervisors]
        
        # Находим всех агентов этих супервайзеров
        agents = db.query(models.Employee).filter(
            models.Employee.supervisor_id.in_(supervisor_ids)
        ).all()
        
        return [user.employee_id] + supervisor_ids + [agent.id for agent in agents]
    
    return []
