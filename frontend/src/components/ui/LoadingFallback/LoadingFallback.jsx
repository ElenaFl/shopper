import React from "react";

/**
 * LoadingFallback —  компонент-заглушка для отображения состояния загрузки.
 *
 * Назначение:
 * - Используется как placeholder, пока загружается основной контент (lazy, data fetching и т.д.).
 * - Может быть передан в Suspense/показываться при ожидании API-вызовов.
 *
 * Поведение:
 * - Отображает простой блок с текстом "Loading...".
 * - Ничего не принимает в props.
 *
 * Пример использования:
 * Suspense — встроенный React-компонент для отложенного рендеринга lazy-компонентов
 * <Suspense fallback={<LoadingFallback />}>
 *   <LazyComponent />
 * </Suspense>
 */
export default function LoadingFallback() {
  // Простой рендер текста; можно заменить на spinner или настраиваемый контент
  return (
    <div role="status" aria-live="polite">
      Loading...
    </div>
  );
}
