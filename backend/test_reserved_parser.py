from import_1c_reserved_parser import parse_reserved_html

# Читаем тестовый файл
with open('../Rezerv.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Парсим
result = parse_reserved_html(html_content)

print("=" * 50)
print("РЕЗУЛЬТАТЫ ПАРСИНГА РЕЗЕРВНЫХ ЗАКАЗОВ:")
print("=" * 50)
print(f"Успех: {result['success']}")
print(f"Всего записей: {len(result['data'])}")
print(f"Отсутствующих сотрудников: {len(result['missing_employees'])}")

if result['errors']:
    print("\nОШИБКИ:")
    for error in result['errors'][:5]:
        print(f"  - {error}")

print("\nПЕРВЫЕ 10 ЗАПИСЕЙ:")
for i, record in enumerate(result['data'][:10]):
    print(f"\n{i+1}. Сотрудник: {record['employee_name_1c']}")
    print(f"   Сумма: {record['value']}")

print("\nСОТРУДНИКИ:")
for emp in result['missing_employees'][:15]:
    print(f"  - {emp}")

# Подсчитываем общую сумму
total = sum(r['value'] for r in result['data'])
print(f"\n💰 ИТОГО РЕЗЕРВНЫХ ЗАКАЗОВ: {total:,.2f} сум")
