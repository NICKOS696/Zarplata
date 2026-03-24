import React, { useState } from 'react';
import { importAPI } from '../services/api';
import { Upload, FileText, AlertCircle, CheckCircle, Users, Package } from 'lucide-react';

const DataImport = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [importType, setImportType] = useState('bulk');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [showMissingEmployees, setShowMissingEmployees] = useState(false);
  const [creatingEmployees, setCreatingEmployees] = useState(false);

  const importTypes = [
    { value: 'bulk', label: '📦 Множественный импорт (все файлы сразу)', icon: Package },
    { value: 'plans', label: 'Планы продаж', icon: FileText },
    { value: 'sales', label: 'Фактические продажи', icon: Package },
    { value: 'reserved', label: 'Заказы в резерве', icon: Package },
    { value: 'kpi', label: 'KPI данные', icon: FileText },
    { value: 'orders', label: 'Статистика заказов (для расчёта дней)', icon: Users },
    { value: 'order_count', label: 'Количество заявок (для грейдов)', icon: Users },
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      if (importType === 'bulk') {
        handleMultipleFileSelect(Array.from(e.dataTransfer.files));
      } else if (e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    }
  };

  const handleFileSelect = (file) => {
    if (file && (file.name.endsWith('.html') || file.name.endsWith('.htm'))) {
      setSelectedFile(file);
      setParseResult(null);
      setImportResult(null);
      setBulkResult(null);
    } else {
      alert('Пожалуйста, выберите HTML файл из 1С');
    }
  };

  const handleMultipleFileSelect = (files) => {
    const htmlFiles = files.filter(f => f.name.endsWith('.html') || f.name.endsWith('.htm'));
    if (htmlFiles.length === 0) {
      alert('Пожалуйста, выберите HTML файлы из 1С');
      return;
    }
    setSelectedFiles(htmlFiles);
    setParseResult(null);
    setImportResult(null);
    setBulkResult(null);
  };

  const handleFileInput = (e) => {
    if (e.target.files) {
      if (importType === 'bulk') {
        handleMultipleFileSelect(Array.from(e.target.files));
      } else if (e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    }
  };

  const handleParse = async () => {
    if (!selectedFile) {
      alert('Выберите файл для загрузки');
      return;
    }

    setLoading(true);
    try {
      const response = await importAPI.parseFile(selectedFile, importType);
      setParseResult(response.data);
      
      if (response.data.missing_employees.length > 0) {
        setShowMissingEmployees(true);
      }
    } catch (error) {
      console.error('Ошибка парсинга:', error);
      alert('Ошибка при парсинге файла: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (employeeData) => {
    try {
      await importAPI.createEmployee(employeeData);
      // Перепарсим файл после создания сотрудника
      await handleParse();
    } catch (error) {
      console.error('Ошибка создания сотрудника:', error);
      alert('Ошибка при создании сотрудника: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleCreateAllEmployees = async () => {
    if (!parseResult?.missing_employees) return;
    
    setCreatingEmployees(true);
    try {
      for (let idx = 0; idx < parseResult.missing_employees.length; idx++) {
        const emp = parseResult.missing_employees[idx];
        
        // Получаем значения из полей ввода
        const telegramInput = document.getElementById(`telegram-${idx}`);
        const positionSelect = document.getElementById(`position-${idx}`);
        
        await importAPI.createEmployee({
          full_name: emp.full_name,
          name_1c: emp.name_1c,
          territory: emp.territory,
          position: positionSelect?.value || 'agent',
          telegram_id: telegramInput?.value || null,
          supervisor: emp.supervisor,
          manager: emp.manager
        });
      }
      // Перепарсим файл после создания всех сотрудников
      await handleParse();
      setShowMissingEmployees(false);
    } catch (error) {
      console.error('Ошибка создания сотрудников:', error);
      alert('Ошибка при создании сотрудников: ' + (error.response?.data?.detail || error.message));
    } finally {
      setCreatingEmployees(false);
    }
  };

  const handleImport = async () => {
    // Множественный импорт
    if (importType === 'bulk') {
      if (selectedFiles.length === 0) {
        alert('Выберите файлы для загрузки');
        return;
      }
      
      setLoading(true);
      try {
        const response = await importAPI.importBulk(selectedFiles, year, month);
        setBulkResult(response.data);
        
        let successCount = 0;
        let errorCount = 0;
        let message = 'Множественный импорт завершён!\n\n';
        
        response.data.results.forEach(r => {
          if (r.status === 'success') {
            successCount++;
            message += `✅ ${r.filename} (${r.type}): загружено ${r.imported}, ошибок ${r.failed}\n`;
          } else {
            errorCount++;
            message += `❌ ${r.filename}: ${r.message}\n`;
          }
        });
        
        message = `Успешно: ${successCount}, Ошибок: ${errorCount}\n\n` + message;
        alert(message);
      } catch (error) {
        console.error('Ошибка импорта:', error);
        alert('Ошибка при импорте данных: ' + (error.response?.data?.detail || error.message));
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Для импорта заказов используем отдельный endpoint без предварительной проверки
    if (importType === 'orders') {
      if (!selectedFile) {
        alert('Выберите файл для загрузки');
        return;
      }
      
      setLoading(true);
      try {
        const response = await importAPI.importOrders(selectedFile);
        setImportResult(response.data);
        let message = `Импорт завершён!\n\nЗагружено: ${response.data.imported}\nПропущено (стандартный расчёт): ${response.data.skipped}\nОшибок: ${response.data.failed}`;
        if (response.data.errors && response.data.errors.length > 0) {
          message += '\n\nОшибки:\n' + response.data.errors.join('\n');
        }
        alert(message);
      } catch (error) {
        console.error('Ошибка импорта:', error);
        alert('Ошибка при импорте данных: ' + (error.response?.data?.detail || error.message));
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Для импорта количества заявок
    if (importType === 'order_count') {
      if (!selectedFile) {
        alert('Выберите файл для загрузки');
        return;
      }
      
      setLoading(true);
      try {
        const response = await importAPI.importOrderCount(selectedFile, year, month);
        setImportResult(response.data);
        let message = `Импорт завершён!\n\nЗагружено: ${response.data.imported}\nОшибок: ${response.data.failed}`;
        if (response.data.errors && response.data.errors.length > 0) {
          message += '\n\nОшибки:\n' + response.data.errors.join('\n');
        }
        alert(message);
      } catch (error) {
        console.error('Ошибка импорта:', error);
        alert('Ошибка при импорте данных: ' + (error.response?.data?.detail || error.message));
      } finally {
        setLoading(false);
      }
      return;
    }
    
    if (!selectedFile || !parseResult) {
      alert('Сначала проверьте файл');
      return;
    }

    if (parseResult.missing_employees.length > 0 || 
        parseResult.missing_brands.length > 0 || 
        parseResult.missing_kpis.length > 0) {
      alert('Сначала создайте отсутствующие сущности');
      return;
    }

    setLoading(true);
    try {
      const response = await importAPI.executeImport(
        selectedFile, 
        importType, 
        year, 
        month
      );
      setImportResult(response.data);
      alert(`Успешно загружено: ${response.data.imported} записей`);
    } catch (error) {
      console.error('Ошибка импорта:', error);
      alert('Ошибка при импорте данных: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const canImport = parseResult && 
    parseResult.missing_employees.length === 0 && 
    parseResult.missing_brands.length === 0 && 
    parseResult.missing_kpis.length === 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <Upload className="mr-3" size={32} />
          Загрузка данных из 1С
        </h1>
        <p className="text-gray-600 mt-1">Импорт планов, продаж и резервных заказов</p>
      </div>

      {/* Выбор типа импорта */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Тип данных</h2>
        <div className="grid grid-cols-2 gap-4">
          {importTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => {
                setImportType(type.value);
                setParseResult(null);
                setImportResult(null);
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                importType === type.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <type.icon className="mx-auto mb-2" size={32} />
              <div className="font-medium">{type.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Выбор периода */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Период</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Год</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Месяц</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString('ru', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Загрузка файла */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {importType === 'bulk' ? 'Файлы из 1С (множественный выбор)' : 'Файл из 1С'}
        </h2>
        
        {importType === 'bulk' && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg text-sm">
            <p className="font-medium text-blue-800 mb-2">📋 Названия файлов для автоопределения типа:</p>
            <ul className="text-blue-700 space-y-1">
              <li>• <strong>план*.html</strong> или <strong>plans.html</strong> → Планы продаж</li>
              <li>• <strong>факт*.html</strong> или <strong>продаж*.html</strong> → Фактические продажи</li>
              <li>• <strong>резерв*.html</strong> или <strong>reserved.html</strong> → Заказы в резерве</li>
              <li>• <strong>кпи*.html</strong> или <strong>kpi.html</strong> → KPI данные</li>
              <li>• <strong>заявк*.html</strong> или <strong>order_count.html</strong> → Количество заявок</li>
            </ul>
          </div>
        )}
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-lg mb-2">
            {importType === 'bulk' ? 'Перетащите HTML файлы сюда' : 'Перетащите HTML файл сюда'}
          </p>
          <p className="text-sm text-gray-500 mb-4">или</p>
          <label className="inline-block">
            <span className="px-4 py-2 bg-blue-500 text-white rounded-md cursor-pointer hover:bg-blue-600">
              {importType === 'bulk' ? 'Выбрать файлы' : 'Выбрать файл'}
            </span>
            <input
              type="file"
              accept=".html,.htm"
              multiple={importType === 'bulk'}
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>

        {/* Множественный импорт - список выбранных файлов */}
        {importType === 'bulk' && selectedFiles.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="font-medium mb-2">Выбрано файлов: {selectedFiles.length}</p>
            <ul className="text-sm text-gray-600 space-y-1 mb-3">
              {selectedFiles.map((file, idx) => (
                <li key={idx}>📄 {file.name}</li>
              ))}
            </ul>
            <button
              onClick={handleImport}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400"
            >
              {loading ? 'Импорт...' : `Импортировать все файлы (${selectedFiles.length})`}
            </button>
          </div>
        )}

        {importType !== 'bulk' && selectedFile && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="font-medium">Выбран файл:</p>
            <p className="text-sm text-gray-600">{selectedFile.name}</p>
            {importType === 'orders' ? (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">
                  Формат файла: Дата | Торговый агент | Количество заказов | Сумма заказов
                </p>
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {loading ? 'Импорт...' : 'Импортировать статистику заказов'}
                </button>
              </div>
            ) : importType === 'order_count' ? (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">
                  Формат файла: Сотрудник | Количество заявок
                </p>
                <p className="text-sm text-gray-500 mb-2">
                  Данные будут загружены в табель за {month}/{year} для расчёта грейдов
                </p>
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-400"
                >
                  {loading ? 'Импорт...' : 'Импортировать количество заявок'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleParse}
                disabled={loading}
                className="mt-3 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400"
              >
                {loading ? 'Проверка...' : 'Проверить файл'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Результаты парсинга */}
      {parseResult && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Результаты проверки</h2>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <CheckCircle className="text-green-500 mr-2" size={24} />
              <span>Найдено записей: <strong>{parseResult.records_count}</strong></span>
            </div>

            {parseResult.missing_employees.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="text-yellow-600 mr-2 mt-1" size={20} />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-800">
                      Отсутствующие сотрудники: {parseResult.missing_employees.length}
                    </p>
                    <button
                      onClick={() => setShowMissingEmployees(!showMissingEmployees)}
                      className="text-sm text-blue-600 hover:underline mt-1"
                    >
                      {showMissingEmployees ? 'Скрыть' : 'Показать'} список
                    </button>
                    
                    {showMissingEmployees && (
                      <div className="mt-3">
                        <div className="max-h-60 overflow-y-auto space-y-3">
                          {parseResult.missing_employees.map((emp, idx) => (
                            <div key={idx} className="p-3 bg-white rounded border">
                              <p className="font-medium text-sm">{emp.full_name}</p>
                              <p className="text-gray-600 text-xs mb-2">📍 {emp.territory}</p>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  placeholder="Telegram ID"
                                  defaultValue={emp.telegram_id || ''}
                                  className="text-xs px-2 py-1 border rounded"
                                  id={`telegram-${idx}`}
                                />
                                <select
                                  className="text-xs px-2 py-1 border rounded"
                                  id={`position-${idx}`}
                                  defaultValue="agent"
                                >
                                  <option value="agent">Агент</option>
                                  <option value="supervisor">Супервайзер</option>
                                  <option value="manager">Менеджер</option>
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={handleCreateAllEmployees}
                          disabled={creatingEmployees}
                          className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                        >
                          {creatingEmployees ? 'Создание...' : 'Создать всех сотрудников'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {(parseResult.missing_brands.length > 0 || parseResult.missing_kpis.length > 0) && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="text-yellow-600 mr-2 mt-1" size={20} />
                  <div>
                    <p className="font-medium text-yellow-800">
                      Отсутствующие товары/KPI: {parseResult.missing_brands.length}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {parseResult.missing_brands.join(', ')}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      Создайте их в разделе "Справочники → Бренды" или "Справочники → KPI"
                    </p>
                  </div>
                </div>
              </div>
            )}

            {canImport && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="text-green-600 mr-2" size={20} />
                  <span className="font-medium text-green-800">
                    Все проверки пройдены! Можно загружать данные.
                  </span>
                </div>
              </div>
            )}
          </div>

          {canImport && (
            <button
              onClick={handleImport}
              disabled={loading}
              className="mt-6 w-full px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 font-medium"
            >
              {loading ? 'Загрузка...' : 'Загрузить данные'}
            </button>
          )}
        </div>
      )}

      {/* Результаты импорта */}
      {importResult && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Результаты загрузки</h2>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <CheckCircle className="text-green-500 mr-2" size={20} />
              <span>Загружено: <strong>{importResult.imported}</strong></span>
            </div>
            {importResult.failed > 0 && (
              <div className="flex items-center">
                <AlertCircle className="text-red-500 mr-2" size={20} />
                <span>Ошибок: <strong>{importResult.failed}</strong></span>
              </div>
            )}
          </div>

          {importResult.errors && importResult.errors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-medium text-red-800 mb-2">Ошибки:</p>
              <ul className="text-sm text-red-700 space-y-1">
                {importResult.errors.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataImport;
