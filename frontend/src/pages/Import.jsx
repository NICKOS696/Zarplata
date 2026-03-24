import React, { useState, useEffect } from 'react';
import { importAPI, importLogsAPI } from '../services/api';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

function Import() {
  const [salesFile, setSalesFile] = useState(null);
  const [attendanceFile, setAttendanceFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoadingLogs(true);
      const response = await importLogsAPI.getAll();
      setLogs(response.data);
    } catch (error) {
      console.error('Ошибка загрузки логов:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSalesImport = async () => {
    if (!salesFile) {
      alert('Выберите файл для импорта');
      return;
    }

    try {
      setUploading(true);
      const response = await importAPI.importSalesHTML(salesFile);
      alert(`Импорт завершен!\nИмпортировано: ${response.data.imported}\nОшибок: ${response.data.failed}`);
      setSalesFile(null);
      loadLogs();
    } catch (error) {
      console.error('Ошибка импорта:', error);
      alert('Ошибка импорта: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleAttendanceImport = async () => {
    if (!attendanceFile) {
      alert('Выберите файл для импорта');
      return;
    }

    try {
      setUploading(true);
      const response = await importAPI.importAttendanceHTML(attendanceFile);
      alert(`Импорт завершен!\nИмпортировано: ${response.data.imported}\nОшибок: ${response.data.failed}`);
      setAttendanceFile(null);
      loadLogs();
    } catch (error) {
      console.error('Ошибка импорта:', error);
      alert('Ошибка импорта: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'failed':
        return <XCircle className="text-red-600" size={20} />;
      case 'partial':
        return <AlertCircle className="text-orange-600" size={20} />;
      default:
        return <FileText className="text-gray-600" size={20} />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Импорт данных</h1>
        <p className="text-gray-600 mt-1">Загрузка данных из HTML файлов 1С</p>
      </div>

      {/* Sales Import */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Upload size={20} className="text-blue-600" />
          <h3 className="font-semibold text-lg">Импорт продаж</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="label">HTML файл с данными о продажах из 1С</label>
            <input
              type="file"
              accept=".html,.htm"
              onChange={(e) => setSalesFile(e.target.files[0])}
              className="input"
            />
            {salesFile && (
              <p className="text-sm text-gray-600 mt-2">
                Выбран файл: {salesFile.name}
              </p>
            )}
          </div>
          
          <button
            onClick={handleSalesImport}
            disabled={!salesFile || uploading}
            className="btn btn-primary"
          >
            {uploading ? 'Импорт...' : 'Импортировать продажи'}
          </button>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Формат файла:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• HTML таблица из 1С</li>
            <li>• Колонки: Сотрудник, Дата, Бренд, KPI, Сумма</li>
            <li>• Сотрудники должны быть предварительно добавлены в систему</li>
          </ul>
        </div>
      </div>

      {/* Attendance Import */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Upload size={20} className="text-green-600" />
          <h3 className="font-semibold text-lg">Импорт табеля</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="label">HTML файл с табелем посещаемости из 1С</label>
            <input
              type="file"
              accept=".html,.htm"
              onChange={(e) => setAttendanceFile(e.target.files[0])}
              className="input"
            />
            {attendanceFile && (
              <p className="text-sm text-gray-600 mt-2">
                Выбран файл: {attendanceFile.name}
              </p>
            )}
          </div>
          
          <button
            onClick={handleAttendanceImport}
            disabled={!attendanceFile || uploading}
            className="btn btn-success"
          >
            {uploading ? 'Импорт...' : 'Импортировать табель'}
          </button>
        </div>

        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">Формат файла:</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• HTML таблица из 1С</li>
            <li>• Колонки: Сотрудник, Дата, Статус, Часы</li>
            <li>• Статус: "Присутствовал" или "Отсутствовал"</li>
          </ul>
        </div>
      </div>

      {/* Import Logs */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <FileText size={20} />
          <h3 className="font-semibold text-lg">История импорта</h3>
        </div>

        {loadingLogs ? (
          <div className="text-center py-8">Загрузка...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            История импорта пуста
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Тип</th>
                  <th>Файл</th>
                  <th>Импортировано</th>
                  <th>Ошибок</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-sm">
                      {new Date(log.created_at).toLocaleString('ru-RU')}
                    </td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.import_type === 'sales' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {log.import_type === 'sales' ? 'Продажи' : 'Табель'}
                      </span>
                    </td>
                    <td className="text-sm text-gray-600">{log.file_name || '-'}</td>
                    <td className="font-semibold text-green-600">{log.records_imported}</td>
                    <td className="font-semibold text-red-600">{log.records_failed}</td>
                    <td>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(log.status)}
                        <span className="text-sm capitalize">{log.status}</span>
                      </div>
                      {log.error_message && (
                        <p className="text-xs text-red-600 mt-1">{log.error_message}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Import;
