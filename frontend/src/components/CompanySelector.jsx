import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import iconLogo from '../assets/icon.svg';

function CompanySelector() {
  const { companies, selectCompany } = useAuth();
  const [selectedId, setSelectedId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedId) {
      selectCompany(parseInt(selectedId));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <div className="flex justify-center">
            <img src={iconLogo} alt="Zarplata" className="w-36 h-36" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Выбор компании
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Выберите компанию для работы
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Компания
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="input w-full"
              required
            >
              <option value="">Выберите компанию...</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="submit"
              disabled={!selectedId}
              className="w-full btn btn-primary flex justify-center items-center"
            >
              <Building2 className="mr-2" size={20} />
              Продолжить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CompanySelector;
