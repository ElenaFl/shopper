import { useEffect, useState } from "react";

/**
 * useDebounce
 *
 * Возвращает отложенное значение `value`, которое обновится только спустя `delay` мс
 * после последнего изменения `value`.
 *
 * Применение:
 * const debounced = useDebounce(value, 300);
 *
 * Для фильтрации/поиска, чтобы не вызывать обработчик на каждый символ.
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
