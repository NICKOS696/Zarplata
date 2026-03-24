from import_1c_sales_parser import parse_sales_html

# Читаем тестовый файл
with open('../Date Sale Nonfood.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Парсим
result = parse_sales_html(html_content)

print("=" * 50)
print("РЕЗУЛЬТАТЫ ПАРСИНГА ПРОДАЖ:")
print("=" * 50)
print(f"Успех: {result['success']}")
print(f"Всего записей: {len(result['data'])}")
print(f"Отсутствующих сотрудников: {len(result['missing_employees'])}")
print(f"Отсутствующих брендов: {len(result['missing_brands'])}")

if result['errors']:
    print("\nОШИБКИ:")
    for error in result['errors'][:5]:
        print(f"  - {error}")

print("\nПЕРВЫЕ 5 ЗАПИСЕЙ:")
for i, record in enumerate(result['data'][:5]):
    print(f"\n{i+1}. Сотрудник: {record['employee_name_1c']}")
    print(f"   Бренд: {record['brand_name']}")
    print(f"   Сумма: {record['value']}")

print("\nСОТРУДНИКИ:")
for emp in result['missing_employees'][:10]:
    print(f"  - {emp}")

print("\nБРЕНДЫ:")
for brand in result['missing_brands']:
    print(f"  - {brand}")
