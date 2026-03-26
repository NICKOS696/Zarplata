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
                rows = all_rows[1:]  # Пропускаем заголовок
        
        for idx, row in enumerate(rows):
            cells = row.find_all('td')
            
            # Логируем первую строку полностью для определения структуры
            if idx == 0:
                print(f"=== СТРУКТУРА ФАЙЛА РЕЗЕРВНЫХ ЗАКАЗОВ ===")
                print(f"Количество столбцов: {len(cells)}")
                for i, cell in enumerate(cells):
                    print(f"Столбец {i+1}: '{cell.get_text(strip=True)[:100]}'")
            
            # Нужно минимум 7 столбцов (Пользователь, Территория, ID Telegram, Супервайзер, Менеджер, Заказ, Сумма)
            if len(cells) < 7:
                continue
            
            # Извлекаем данные
            # Столбец 1: Пользователь (с территорией)
            employee_name_1c = cells[0].get_text(strip=True)
            # Столбец 7: Сумма (индекс 6)
            value_text = cells[6].get_text(strip=True)
            
            # Парсим сумму (убираем пробелы и неразрывные пробелы)
            value = 0.0
            if value_text:
                try:
                    # Убираем все виды пробелов (обычные, неразрывные) и заменяем запятую на точку
                    value_clean = value_text.replace(' ', '').replace('\xa0', '').replace(',', '.')
                    value = float(value_clean)
                except ValueError:
                    # Если не удалось распарсить сумму, пропускаем строку
                    continue
            
            # Пропускаем строки с нулевой или отрицательной суммой (возвраты)
            if value <= 0:
                continue
            
            # Добавляем запись для подсчета
            record = {
                'employee_name_1c': employee_name_1c,  # Полное имя с территорией
                'value': value  # Сумма для проверки > 0
            }
            
            result['data'].append(record)
        
        # Группируем по сотрудникам и суммируем значения
        from collections import defaultdict
        employee_sums = defaultdict(float)
        
        for record in result['data']:
            employee_sums[record['employee_name_1c']] += record['value']
        
        # Формируем итоговый результат: для каждого сотрудника - сумма резервных заказов
        result['data'] = [
            {
                'employee_name_1c': emp_name,
                'value': total_sum  # Сумма резервных заказов
            }
            for emp_name, total_sum in employee_sums.items()
        ]
        
        # Собираем уникальные значения для проверки
        result['missing_employees'] = list(employee_sums.keys())
        
    except Exception as e:
        result['success'] = False
        result['errors'].append(f"Ошибка парсинга: {str(e)}")
    
    return result
