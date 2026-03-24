"""Создание пользователя admin с простым хешем"""

from sqlalchemy import create_engine, text
from database import DATABASE_URL
import bcrypt

def create_admin():
    engine = create_engine(DATABASE_URL)
    
    # Создаем хеш для пароля "admin"
    password = "admin"
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    with engine.connect() as conn:
        # Удаляем старого админа если есть
        conn.execute(text("DELETE FROM users WHERE username = 'admin'"))
        conn.commit()
        
        # Создаем нового
        conn.execute(text("""
            INSERT INTO users (username, password_hash, role, is_active) 
            VALUES (:username, :password_hash, :role, :is_active)
        """), {
            "username": "admin",
            "password_hash": password_hash,
            "role": "admin",
            "is_active": 1
        })
        conn.commit()
        
        print('✅ Пользователь admin создан успешно')
        print('📝 Логин: admin')
        print('📝 Пароль: admin')

if __name__ == '__main__':
    create_admin()
