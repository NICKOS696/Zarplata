"""
Парсер HTML файлов с резервными заказами из 1С
Формат: Заказ.Менеджер | Заказ.Сумма документа | Заказ | Состояние | Дата события | Количество записей
"""
from bs4 import BeautifulSoup
from typing import Dict, List


def parse_reserved_html(html_content: str) -> Dict:
    """
    Парсит HTML файл с резервными заказами из 1С
    
    Формат файла (6 колонок):
    - Заказ.Менеджер (с территорией в скобках, например "Иванов Иван [КАРШИ]")
    - Заказ.Сумма документа
    - Заказ (номер заказа)
    - Состояние
    - Дата события
    - Количество записей
    
    Returns:
        {
            'success': bool,
            'data': List[Dict],  # Список резервных заказов
            'missing_employees': List[str],  # Сотрудники, которых нет в системе
            'errors': List[str]
        }
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    
    result = {
        'success': True,
        'data': [],
        'missing_employees': [],
        'errors': []
    }
    
    try:
        # Находим все строки таблицы (пропускаем заголовок)
        rows = soup.find_all('tr', class_='R1')
        
        print(f"=== ПАРСИНГ РЕЗЕРВНЫХ ЗАКАЗОВ ===")
        print(f"Найдено строк с классом R1: {len(rows)}")
        
        # Если не нашли строки с классом R1, пробуем найти все строки таблицы
        if len(rows) == 0:
            table = soup.find('table')
            if table:
                all_rows = table.find_all('tr')
                print(f"Всего строк в таблице: {len(all_rows)}")
                if len(all_rows) > 0:
                    first_row = all_rows[0]
                    print(f"Первая строка (заголовок): {[cell.get_text(strip=True) for cell in first_row.find_all(['td', 'th'])]}")
                    if len(all_rows) > 1:
                        second_row = all_rows[1]
                        cells = second_row.find_all(['td', 'th'])
                        print(f"Вторая строка (данные), количество столбцов: {len(cells)}")
                        print(f"Содержимое второй строки: {[cell.get_text(strip=True)[:50] for cell in cells]}")
                rows = all_rows[1:]  # Пропускаем заголовок
        
        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 2:
                continue
            
            # Извлекаем данные
            employee_name_1c = cells[0].get_text(strip=True)  # Менеджер (с территорией)
            value_text = cells[1].get_text(strip=True)         # Сумма документа
            
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
                'value': value
            }
            
            result['data'].append(record)
        
        # Собираем уникальные значения для проверки
        result['missing_employees'] = list(set(r['employee_name_1c'] for r in result['data']))
        
    except Exception as e:
        result['success'] = False
        result['errors'].append(f"Ошибка парсинга: {str(e)}")
    
    return result
