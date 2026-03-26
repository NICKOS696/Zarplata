"""
Парсер HTML файлов из 1С
Поддерживает загрузку: планов, продаж, KPI, резервных заказов
"""
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import re


def parse_1c_html(html_content: str, data_type: str = 'plans') -> Dict:
    """
    Парсит HTML файл из 1С
    
    Args:
        html_content: HTML контент файла
        data_type: Тип данных - 'plans' (планы) или 'sales' (продажи)
    """
    """
    Парсинг HTML файла из 1С
    
    Args:
        html_content: содержимое HTML файла
        import_type: тип импорта (plans, sales, kpi, reserved)
    
    Returns:
        {
            'success': bool,
            'data': List[Dict],
            'missing_employees': List[str],  # Сотрудники, которых нет в системе
            'missing_brands': List[str],      # Бренды, которых нет в системе
            'missing_kpis': List[str],        # KPI, которых нет в системе
            'errors': List[str]
        }
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    
    result = {
        'success': True,
        'data': [],
        'missing_employees': set(),
        'missing_brands': set(),
        'missing_kpis': set(),
        'errors': []
    }
    
    try:
        # Находим все строки таблицы (пропускаем заголовок)
        rows = soup.find_all('tr', class_='R1')
        
        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 7:
                continue
            
            # Извлекаем данные (новый формат с отдельными колонками)
            employee_name = cells[0].get_text(strip=True)      # Пользователь (ФИО)
            territory = cells[1].get_text(strip=True)          # Территория
            telegram_id = cells[2].get_text(strip=True)        # ID Телеграм
            supervisor = cells[3].get_text(strip=True)         # Супервайзер
            manager = cells[4].get_text(strip=True)            # Менеджер
            item_name = cells[5].get_text(strip=True)          # Бренд или KPI
            value_text = cells[6].get_text(strip=True)         # Сумма
            
            # name_1c = просто имя пользователя, БЕЗ территории
            employee_name_1c = employee_name
            
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
                'employee_name_1c': employee_name_1c,
                'employee_name': employee_name,
                'territory': territory,
                'telegram_id': telegram_id if telegram_id else None,
                'supervisor': supervisor,
                'manager': manager,
                'item_name': item_name,
                'value': value
            }
            
            result['data'].append(record)
        
        # Собираем уникальные значения для проверки
        result['missing_employees'] = list(set(r['employee_name_1c'] for r in result['data']))
        # Все товары добавляем в оба списка - система сама определит при загрузке
        all_items = list(set(r['item_name'] for r in result['data']))
        
        print(f"=== ПАРСИНГ {data_type.upper()} ===")
        print(f"Найдено уникальных item_name: {len(all_items)}")
        print(f"Примеры item_name: {all_items[:5]}")
        
        # Для резервных заказов - только бренды (нет KPI)
        if data_type == 'reserved':
            result['missing_brands'] = all_items
            result['missing_kpis'] = []
        else:
            # Для планов и KPI - добавляем в оба списка
            result['missing_brands'] = all_items
            result['missing_kpis'] = all_items
        
    except Exception as e:
        result['success'] = False
        result['errors'].append(f"Ошибка парсинга: {str(e)}")
    
    return result


def is_kpi(item_name: str) -> bool:
    """Определяет, является ли элемент KPI (по названию)"""
    # KPI обычно имеют префикс "KPI" или специфичные названия
    item_upper = item_name.upper()
    kpi_keywords = ['KPI', 'АКБ']  # БИГ - это бренд, не KPI!
    
    # Проверяем точное совпадение или начало строки
    for keyword in kpi_keywords:
        if item_upper == keyword or item_upper.startswith(keyword + ' '):
            return True
    return False


def extract_employee_info(employee_name_1c: str) -> Dict:
    """
    Извлекает ФИО и территорию из строки вида "Иванов Иван Иванович [ТЕРРИТОРИЯ]"
    
    Returns:
        {
            'full_name': str,
            'territory': str
        }
    """
    match = re.match(r'(.+?)\s*\[(.+?)\]', employee_name_1c)
    if match:
        return {
            'full_name': match.group(1).strip(),
            'territory': match.group(2).strip()
        }
    return {
        'full_name': employee_name_1c.strip(),
        'territory': None
    }


def group_by_employee(data: List[Dict]) -> Dict[str, List[Dict]]:
    """Группирует данные по сотрудникам"""
    grouped = {}
    for record in data:
        employee = record['employee_name_1c']
        if employee not in grouped:
            grouped[employee] = []
        grouped[employee].append(record)
    return grouped
