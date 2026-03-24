-- Добавление таблицы для заказов в резерве
CREATE TABLE IF NOT EXISTS reserved_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    brand_id INTEGER,
    kpi_type_id INTEGER,
    order_date DATE NOT NULL,
    reserved_value REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees (id),
    FOREIGN KEY (brand_id) REFERENCES brands (id),
    FOREIGN KEY (kpi_type_id) REFERENCES kpi_types (id)
);

CREATE INDEX IF NOT EXISTS idx_reserved_orders_employee ON reserved_orders(employee_id);
CREATE INDEX IF NOT EXISTS idx_reserved_orders_date ON reserved_orders(order_date);
