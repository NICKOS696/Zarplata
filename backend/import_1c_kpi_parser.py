"""
Парсер для HTML файлов с KPI данными из 1С
Автоматически определяет тип KPI по содержимому файла
"""

from bs4 import BeautifulSoup
from typing import Dict, List
import re


def parse_kpi_html(html_content: str) -> Dict:
    """
    Парсит HTML файл с KPI данными из 1С
    
    Ожидаемая структура (3 столбца):
    - Столбец 1: Пользователь (ФИО сотрудника с территорией)
    - Столбец 2: KPI (название KPI)
    - Столбец 3: Сумма (значение)
    
    Returns:
        Dict с полями:
        - records: список записей с employee_name_1c, kpi_name, value
        - total_records: количество записей
        - employees: уникальные сотрудники
        - kpi_types: найденные типы KPI
        - total_sum: общая сумма
    """
    
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Ищем таблицу с данными
    table = soup.find('table')
    if not table:
        raise ValueError("Таблица не найдена в HTML файле")
    
    rows = table.find_all('tr')
    if len(rows) < 2:
        raise ValueError("Недостаточно строк в таблице")
    
    records = []
    employees = set()
    kpi_types = set()
    total_sum = 0
    
    # Парсим строки с данными (пропускаем заголовок)
    for row in rows[1:]:
        cells = row.find_all(['td', 'th'])
        
        if len(cells) < 3:
            continue
        
        # Столбец 1: Пользователь (ФИО с территорией)
        employee_cell = cells[0].get_text(strip=True)
        if not employee_cell or employee_cell == 'Итого' or employee_cell == 'Всего':
            continue
        
        # Столбец 2: KPI (название)
        kpi_name = cells[1].get_text(strip=True)
        if not kpi_name or kpi_name == '-':
            continue
        
        # Столбец 3: Сумма (значение)
        value_text = cells[2].get_text(strip=True)
        if not value_text or value_text == '-':
            continue
        
        # Очищаем значение от пробелов и неразрывных пробелов
        value_text = value_text.replace(' ', '').replace('\xa0', '').replace(',', '.')
        
        try:
            value = float(value_text)
        except ValueError:
            continue
        
        if value == 0:
            continue
        
        employees.add(employee_cell)
        kpi_types.add(kpi_name)
        total_sum += value
        
        records.append({
            'employee_name_1c': employee_cell,
            'kpi_name': kpi_name,
            'value': value
        })
    
    return {
        'records': records,
        'total_records': len(records),
        'employees': sorted(list(employees)),
        'kpi_types': sorted(list(kpi_types)),
        'total_sum': total_sum
    }


def detect_kpi_type(kpi_name: str) -> str:
    """
    Определяет тип KPI по названию столбца
    Возвращает нормализованное название для поиска в базе
    """
    kpi_name_lower = kpi_name.lower()
    
    # Словарь для сопоставления названий
    kpi_mapping = {
        'визиты': ['визит', 'посещен', 'visit'],
        'активные точки': ['активн', 'точк', 'active', 'outlet'],
        'новые точки': ['нов', 'точк', 'new', 'outlet'],
        'дистрибуция': ['дистриб', 'distribution'],
        'выкладка': ['выкладк', 'display'],
        'промо': ['промо', 'promo', 'акци'],
    }
    
    # Ищем совпадения
    for standard_name, keywords in kpi_mapping.items():
        for keyword in keywords:
            if keyword in kpi_name_lower:
                return standard_name
    
    # Если не нашли совпадение, возвращаем оригинальное название
    return kpi_name
