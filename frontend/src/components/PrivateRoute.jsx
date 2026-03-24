import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function PrivateRoute({ children, allowedRoles = [], requiredPage = null }) {
  const { user, loading, hasRole, hasAccess } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Если пользователь не авторизован, перенаправляем на логин
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Если указаны разрешенные роли, проверяем роль пользователя
  if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600 mb-4">403</h1>
          <p className="text-xl text-gray-700">Доступ запрещен</p>
          <p className="text-gray-500 mt-2">У вас нет прав для просмотра этой страницы</p>
        </div>
      </div>
    );
  }

  // Если указана требуемая страница, проверяем доступ
  if (requiredPage && !hasAccess(requiredPage)) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600 mb-4">403</h1>
          <p className="text-xl text-gray-700">Доступ запрещен</p>
          <p className="text-gray-500 mt-2">У вас нет прав для просмотра этой страницы</p>
        </div>
      </div>
    );
  }

  return children;
}

export default PrivateRoute;
