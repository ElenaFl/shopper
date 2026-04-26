import React from "react";

/**
 * Pagination — компонент постраничной навигации.
 *
 * Props:
 * @param {object} meta - Метаданные пагинации. Поддерживается несколько форматов:
 *   - { current_page, per_page, total, last_page }
 *   - { currentPage, perPage, total_items, lastPage }
 *   - { current_page, last_page } (минимальный набор)
 *   Компонент пытается безопасно прочитать значения из разных вариантов ключей.
 * @param {(page:number) => void} onChange - Коллбек, вызываемый при выборе страницы.
 *
 * Поведение:
 * - Если meta отсутствует — компонент не рендерится.
 * - Определяет current (текущая страница), last (количество страниц), perPage и total.
 * - Если известны perPage и total и весь набор помещается на одну страницу — пагинация скрывается.
 * - Если perPage неизвестен, но last <= 1 — тоже скрываем пагинацию.
 * - Построение списка страниц:
 *   - Если страниц <= 7: отображаем все номера.
 *   - Иначе: показываем 1, last и "окно" вокруг current (по 2 страницы слева и справа).
 *     При необходимости добавляем троеточия («…») слева/справа.
 * - При клике на номер страницы вызывается onChange(newPage) (защита от кликов по текущей странице и по троеточиям).
 *
 * Accessibility (A11y):
 * - Поставлен aria-label="Pagination" на контейнер <nav>.
 * - Кнопки имеют semantic <button>, поддерживают disabled для Prev/Next.
 *
 * Алгоритм и особенности реализации:
 * - Функции pushPage, addRange инкапсулируют логику построения массива страниц.
 * - Пороги (окно ±2) можно конфигурировать при необходимости, сейчас захардкожены.
 * - Точки с троеточием представлены специальными маркерами "left-ellipsis" и "right-ellipsis".
 *
 * Примеры использования:
 * <Pagination meta={{ current_page: 3, last_page: 10 }} onChange={(p) => setPage(p)} />
 *
 */

export const Pagination = ({ meta, onChange }) => {
  // meta: { current_page, per_page, total, last_page } OR { current_page, last_page }
  if (!meta) return null;

  //безопасно нормализуем входные данные из разных форматов
  const current = Number(meta.current_page || meta.currentPage || 1);
  const last = Number(meta.last_page || meta.lastPage || meta.last || 1);
  const perPage = Number(
    meta.per_page || meta.perPage || meta.per_page_value || 0,
  );
  const total = Number(meta.total || meta.total_items || meta.count || 0);

  // если известны total и perPage и всё помещается на одной странице — скрываем пагинацию
  if (perPage > 0 && total > 0 && total <= perPage) return null;

  //еЕсли perPage неизвестен, но last <= 1 — скрываем пагинацию
  if (!perPage && last <= 1) return null;

  const arr = [];

  // вспомогательные функции для построения окна страниц
  const pushPage = (p) => arr.push(p);
  const addRange = (from, to) => {
    for (let i = from; i <= to; i++) pushPage(i);
  };

  // лостроение списка страниц: если немного страниц — показываем все,
  // иначе — 1, окно вокруг current, троеточия и last
  if (last <= 7) {
    addRange(1, last);
  } else {
    // вычисляет границы окна страниц, которые будут показаны между первой и последней страницами

    // pushPage(1) — всегда добавляет первую страницу (1) в список видимых элементов
    pushPage(1);
    // левую границу окна выбирают как либо страницу 2, либо (current − 2), в зависимости от того, что больше. То есть:
    //если current маленькая (1 или 2), left будет 2;
    //если current больше, left будет current − 2 (чтобы показать две страницы слева от текущей).
    let left = Math.max(2, current - 2);

    // равую границу окна выбирают как либо страницу last−1, либо (current + 2), в зависимости от того, что меньше. То есть:
    // если current близка к концу, right будет last−1;
    //иначе right будет current + 2 (чтобы показать две страницы справа от текущей).
    let right = Math.min(last - 1, current + 2);

    if (left > 2) pushPage("left-ellipsis");
    addRange(left, right);
    if (right < last - 1) pushPage("right-ellipsis");
    pushPage(last);
  }

  // итог: при большом количестве страниц (last > 7) компонент всегда гарантированно показывает:
  // первую страницу (1),
  //окно страниц от left до right (обычно это текущая страница ±2, но обрезанное границами 2..last−1),
  //последнюю страницу (pushPage(last) ниже в коде),
  //и при необходимости добавляет троеточие слева, если left > 2, и справа, если right < last−1.

  // обработчик клика по странице: игнорируем троеточия и текущую страницу
  const onClickPage = (p) => {
    // если нажатый элемент — маркер троеточия (левое или правое), выходим и ничего не делаем.
    // троеточия визуальные — их нельзя нажимать для перехода (в текущей реализации).
    if (p === "left-ellipsis" || p === "right-ellipsis") return;
    // если пользователь кликнул по номеру страницы, которая уже активна (текущая страница), тоже ничего не делаем — предотвращаем лишние вызовы onChange.
    if (p === current) return;
    // если передан коллбек onChange, вызываем его с числовым значением страницы.
    // Number(p) преобразует p (в идеале — число или строка с числом) в число.
    // эта строка выполняется только если предыдущие проверки не сработали (то есть пользователь нажал на другой номер страницы).
    onChange && onChange(Number(p));
  };

  return (
    <nav className="flex items-center gap-2" aria-label="Pagination">
      <button
        className="pagination-btn"
        onClick={() => current > 1 && onChange(current - 1)}
        disabled={current <= 1}
      >
        Prev
      </button>

      {arr.map((p, idx) =>
        p === "left-ellipsis" || p === "right-ellipsis" ? (
          <span key={p + idx} className="px-2">
            …
          </span>
        ) : (
          <button
            key={p}
            // onClick передаёт значение p (номер страницы или — в некоторых случаях — маркер вроде "left-ellipsis") в обработчик onClickPage.
            onClick={() => onClickPage(p)}
            className={`px-3 py-1 border rounded ${p === current ? "font-bold bg-gray-200" : ""}`}
          >
            {p}
          </button>
        ),
      )}

      <button
        className="pagination-btn"
        onClick={() => current < last && onChange(current + 1)}
        disabled={current >= last}
      >
        Next
      </button>
    </nav>
  );
};
