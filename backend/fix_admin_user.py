"""Исправление пользователя admin - пересоздание с правильным хешем пароля"""

from sqlalchemy import create_engine, text
from database import DATABASE_URL
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def fix_admin_user():
    engine = create_engine(DATABASE_URL)
    
    # Создаем правильный хеш для пароля "admin"
    password_hash = pwd_context.hash("admin")
    
    with engine.connect() as conn:
        # Удаляем старого админа
        conn.execute(text("DELETE FROM users WHERE username = 'admin'"))
        conn.commit()
        
        # Создаем нового с правильным хешем
        conn.execute(text("""
            INSERT INTO users (username, password_hash, role, is_active) 
            VALUES (:username, :password_hash, :role, :is_active)
        """), {
            "username": "admin",
            "password_hash": password_hash,
            "role": "admin",
            "is_active": True
        })
        conn.commit()
        
        print('✅ Пользователь admin пересоздан с правильным хешем пароля')
        print('📝 Логин: admin')
        print('📝 Пароль: admin')

if __name__ == '__main__':
    fix_admin_user()
