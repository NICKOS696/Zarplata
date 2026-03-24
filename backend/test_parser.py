from import_1c_parser import parse_1c_html

# Читаем тестовый файл
with open('../тест план.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Парсим
result = parse_1c_html(html_content, 'plans')

print("=" * 50)
print("РЕЗУЛЬТАТЫ ПАРСИНГА:")
print("=" * 50)
print(f"Успех: {result['success']}")
print(f"Всего записей: {len(result['data'])}")
print(f"Отсутствующих сотрудников: {len(result['missing_employees'])}")
print(f"Отсутствующих брендов: {len(result['missing_brands'])}")
print(f"Отсутствующих KPI: {len(result['missing_kpis'])}")

if result['errors']:
    print("\nОШИБКИ:")
    for error in result['errors'][:5]:  # Первые 5 ошибок
        print(f"  - {error}")

print("\nПЕРВЫЕ 5 ЗАПИСЕЙ:")
for i, record in enumerate(result['data'][:5]):
    print(f"\n{i+1}. Сотрудник: {record['employee_name_1c']}")
    print(f"   Территория: {record['territory']}")
    print(f"   Telegram ID: {record['telegram_id']}")
    print(f"   Товар: {record['item_name']}")
    print(f"   Сумма: {record['value']}")

print("\nБРЕНДЫ:")
for brand in result['missing_brands'][:10]:
    print(f"  - {brand}")

print("\nKPI:")
for kpi in result['missing_kpis'][:10]:
    print(f"  - {kpi}")
