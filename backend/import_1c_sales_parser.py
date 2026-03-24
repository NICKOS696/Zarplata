"""
Парсер HTML файлов с продажами из 1С
Формат: Пользователь | Супервайзер | Менеджер | Бренды | Сумма без скидки | АКБ
"""
from bs4 import BeautifulSoup
from typing import Dict, List


def parse_sales_html(html_content: str) -> Dict:
    """
    Парсит HTML файл с продажами из 1С
    
    Формат файла (6 колонок):
    - Пользователь (с территорией в скобках, например "Иванов Иван [КАРШИ]")
    - Супервайзер
    - Менеджер
    - Бренды
    - Сумма без скидки
    - АКБ (количество)
    
    Returns:
        {
            'success': bool,
            'data': List[Dict],  # Список записей продаж
            'missing_employees': List[str],  # Сотрудники, которых нет в системе
            'missing_brands': List[str],     # Бренды, которых нет в системе
            'errors': List[str]
        }
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    
    result = {
        'success': True,
        'data': [],
        'missing_employees': [],
        'missing_brands': [],
        'errors': []
    }
    
    try:
        # Находим все строки таблицы (пропускаем заголовок)
        rows = soup.find_all('tr', class_='R1')
        
        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 5:
                continue
            
            # Извлекаем данные
            employee_name_1c = cells[0].get_text(strip=True)  # Пользователь (с территорией)
            supervisor = cells[1].get_text(strip=True)         # Супервайзер
            manager = cells[2].get_text(strip=True)            # Менеджер
            brand_name = cells[3].get_text(strip=True)         # Бренд
            value_text = cells[4].get_text(strip=True)         # Сумма без скидки
            
            # Парсим сумму (убираем пробелы и неразрывные пробелы)
            value = 0.0
            if value_text:
                try:
                    # Убираем все виды пробелов (обычные, неразрывные) и заменяем запятую на точку
                    value_clean = value_text.replace(' ', '').replace('\xa0', '').replace(',', '.')
                    value = float(value_clean)
                except ValueError:
                    result['errors'].append(f"Не удалось распарсить сумму: {value_text}")
                    continue
            
            # Пропускаем строки с нулевой суммой
            if value == 0:
                continue
            
            # Добавляем запись
            record = {
                'employee_name_1c': employee_name_1c,  # Полное имя с территорией
                'brand_name': brand_name,
                'value': value,
                'supervisor': supervisor,
                'manager': manager
            }
            
            result['data'].append(record)
        
        # Собираем уникальные значения для проверки
        result['missing_employees'] = list(set(r['employee_name_1c'] for r in result['data']))
        result['missing_brands'] = list(set(r['brand_name'] for r in result['data']))
        
    except Exception as e:
        result['success'] = False
        result['errors'].append(f"Ошибка парсинга: {str(e)}")
    
    return result
