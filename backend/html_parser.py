from bs4 import BeautifulSoup
import pandas as pd
from typing import List, Dict, Any
from datetime import datetime, date
import re


class HTMLParser1C:
    """Парсер HTML файлов из 1С для импорта данных о продажах"""
    
    def __init__(self):
        self.encoding = 'utf-8'
    
    def parse_sales_html(self, html_content: str) -> List[Dict[str, Any]]:
        """
        Парсит HTML файл с данными о продажах из 1С
        
        Ожидаемая структура таблицы:
        - Сотрудник
        - Дата
        - Бренд
        - KPI
        - Сумма/Количество
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Ищем таблицу с данными
        table = soup.find('table')
        if not table:
            raise ValueError("Таблица не найдена в HTML файле")
        
        # Парсим заголовки
        headers = []
        header_row = table.find('thead')
        if header_row:
            headers = [th.get_text(strip=True) for th in header_row.find_all('th')]
        else:
            # Если нет thead, берем первую строку
            first_row = table.find('tr')
            if first_row:
                headers = [td.get_text(strip=True) for td in first_row.find_all(['th', 'td'])]
        
        # Парсим данные
        sales_data = []
        rows = table.find_all('tr')[1:] if not header_row else table.find('tbody').find_all('tr')
        
        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 3:  # Минимум должно быть 3 колонки
                continue
            
            row_data = [cell.get_text(strip=True) for cell in cells]
            
            # Создаем словарь с данными
            if len(headers) == len(row_data):
                record = dict(zip(headers, row_data))
            else:
                # Если заголовки не совпадают, используем индексы
                record = {
                    'employee': row_data[0] if len(row_data) > 0 else None,
                    'date': row_data[1] if len(row_data) > 1 else None,
                    'brand': row_data[2] if len(row_data) > 2 else None,
                    'kpi': row_data[3] if len(row_data) > 3 else None,
                    'value': row_data[4] if len(row_data) > 4 else None,
                }
            
            sales_data.append(record)
        
        return sales_data
    
    def parse_attendance_html(self, html_content: str) -> List[Dict[str, Any]]:
        """
        Парсит HTML файл с табелем посещаемости из 1С
        
        Ожидаемая структура:
        - Сотрудник
        - Дата
        - Статус (присутствовал/отсутствовал)
        - Часы
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        
        table = soup.find('table')
        if not table:
            raise ValueError("Таблица не найдена в HTML файле")
        
        # Парсим заголовки
        headers = []
        header_row = table.find('thead')
        if header_row:
            headers = [th.get_text(strip=True) for th in header_row.find_all('th')]
        else:
            first_row = table.find('tr')
            if first_row:
                headers = [td.get_text(strip=True) for td in first_row.find_all(['th', 'td'])]
        
        # Парсим данные
        attendance_data = []
        rows = table.find_all('tr')[1:] if not header_row else table.find('tbody').find_all('tr')
        
        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 2:
                continue
            
            row_data = [cell.get_text(strip=True) for cell in cells]
            
            if len(headers) == len(row_data):
                record = dict(zip(headers, row_data))
            else:
                record = {
                    'employee': row_data[0] if len(row_data) > 0 else None,
                    'date': row_data[1] if len(row_data) > 1 else None,
                    'status': row_data[2] if len(row_data) > 2 else None,
                    'hours': row_data[3] if len(row_data) > 3 else '8',
                }
            
            attendance_data.append(record)
        
        return attendance_data
    
    def normalize_date(self, date_str: str) -> date:
        """Нормализует дату из различных форматов"""
        if not date_str:
            return None
        
        # Пробуем различные форматы
        formats = [
            '%d.%m.%Y',
            '%d/%m/%Y',
            '%Y-%m-%d',
            '%d-%m-%Y',
            '%d.%m.%y',
            '%d/%m/%y',
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        
        raise ValueError(f"Не удалось распознать формат даты: {date_str}")
    
    def normalize_number(self, value_str: str) -> float:
        """Нормализует числовое значение"""
        if not value_str:
            return 0.0
        
        # Убираем пробелы и заменяем запятую на точку
        value_str = value_str.replace(' ', '').replace(',', '.')
        
        # Убираем валюту и другие символы
        value_str = re.sub(r'[^\d.]', '', value_str)
        
        try:
            return float(value_str)
        except ValueError:
            return 0.0
    
    def parse_sales_from_file(self, file_path: str) -> List[Dict[str, Any]]:
        """Парсит файл с продажами"""
        with open(file_path, 'r', encoding=self.encoding) as f:
            html_content = f.read()
        
        raw_data = self.parse_sales_html(html_content)
        
        # Нормализуем данные
        normalized_data = []
        for record in raw_data:
            try:
                # Определяем ключи (могут быть разные названия колонок)
                employee_key = self._find_key(record, ['сотрудник', 'employee', 'менеджер', 'manager'])
                date_key = self._find_key(record, ['дата', 'date'])
                brand_key = self._find_key(record, ['бренд', 'brand', 'марка'])
                kpi_key = self._find_key(record, ['kpi', 'показатель', 'тип'])
                value_key = self._find_key(record, ['сумма', 'value', 'количество', 'amount'])
                
                normalized = {
                    'employee_name': record.get(employee_key, ''),
                    'sale_date': self.normalize_date(record.get(date_key, '')),
                    'brand_name': record.get(brand_key, ''),
                    'kpi_name': record.get(kpi_key, ''),
                    'fact_value': self.normalize_number(record.get(value_key, '0')),
                }
                
                if normalized['sale_date'] and normalized['fact_value'] > 0:
                    normalized_data.append(normalized)
            except Exception as e:
                print(f"Ошибка обработки записи: {e}")
                continue
        
        return normalized_data
    
    def parse_attendance_from_file(self, file_path: str) -> List[Dict[str, Any]]:
        """Парсит файл с табелем"""
        with open(file_path, 'r', encoding=self.encoding) as f:
            html_content = f.read()
        
        raw_data = self.parse_attendance_html(html_content)
        
        # Нормализуем данные
        normalized_data = []
        for record in raw_data:
            try:
                employee_key = self._find_key(record, ['сотрудник', 'employee', 'менеджер'])
                date_key = self._find_key(record, ['дата', 'date'])
                status_key = self._find_key(record, ['статус', 'status', 'присутствие'])
                hours_key = self._find_key(record, ['часы', 'hours', 'время'])
                
                status_value = record.get(status_key, '').lower()
                is_present = 'присутств' in status_value or 'present' in status_value or status_value == '+'
                
                normalized = {
                    'employee_name': record.get(employee_key, ''),
                    'work_date': self.normalize_date(record.get(date_key, '')),
                    'is_present': is_present,
                    'hours_worked': self.normalize_number(record.get(hours_key, '8')),
                }
                
                if normalized['work_date']:
                    normalized_data.append(normalized)
            except Exception as e:
                print(f"Ошибка обработки записи: {e}")
                continue
        
        return normalized_data
    
    def _find_key(self, record: Dict, possible_keys: List[str]) -> str:
        """Находит ключ в словаре по списку возможных названий"""
        for key in record.keys():
            key_lower = key.lower()
            for possible_key in possible_keys:
                if possible_key in key_lower:
                    return key
        # Возвращаем первый из возможных, если не нашли
        return possible_keys[0] if possible_keys else ''
    
    def parse_sales_from_bytes(self, file_bytes: bytes) -> List[Dict[str, Any]]:
        """Парсит продажи из байтов (для загрузки через API)"""
        html_content = file_bytes.decode(self.encoding)
        raw_data = self.parse_sales_html(html_content)
        
        normalized_data = []
        for record in raw_data:
            try:
                employee_key = self._find_key(record, ['сотрудник', 'employee', 'менеджер', 'manager'])
                date_key = self._find_key(record, ['дата', 'date'])
                brand_key = self._find_key(record, ['бренд', 'brand', 'марка'])
                kpi_key = self._find_key(record, ['kpi', 'показатель', 'тип'])
                value_key = self._find_key(record, ['сумма', 'value', 'количество', 'amount'])
                
                normalized = {
                    'employee_name': record.get(employee_key, ''),
                    'sale_date': self.normalize_date(record.get(date_key, '')),
                    'brand_name': record.get(brand_key, ''),
                    'kpi_name': record.get(kpi_key, ''),
                    'fact_value': self.normalize_number(record.get(value_key, '0')),
                }
                
                if normalized['sale_date'] and normalized['fact_value'] > 0:
                    normalized_data.append(normalized)
            except Exception as e:
                print(f"Ошибка обработки записи: {e}")
                continue
        
        return normalized_data
    
    def parse_attendance_from_bytes(self, file_bytes: bytes) -> List[Dict[str, Any]]:
        """Парсит табель из байтов (для загрузки через API)"""
        html_content = file_bytes.decode(self.encoding)
        raw_data = self.parse_attendance_html(html_content)
        
        normalized_data = []
        for record in raw_data:
            try:
                employee_key = self._find_key(record, ['сотрудник', 'employee', 'менеджер'])
                date_key = self._find_key(record, ['дата', 'date'])
                status_key = self._find_key(record, ['статус', 'status', 'присутствие'])
                hours_key = self._find_key(record, ['часы', 'hours', 'время'])
                
                status_value = record.get(status_key, '').lower()
                is_present = 'присутств' in status_value or 'present' in status_value or status_value == '+'
                
                normalized = {
                    'employee_name': record.get(employee_key, ''),
                    'work_date': self.normalize_date(record.get(date_key, '')),
                    'is_present': is_present,
                    'hours_worked': self.normalize_number(record.get(hours_key, '8')),
                }
                
                if normalized['work_date']:
                    normalized_data.append(normalized)
            except Exception as e:
                print(f"Ошибка обработки записи: {e}")
                continue
        
        return normalized_data
