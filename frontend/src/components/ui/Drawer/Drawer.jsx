import React from "react";
import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../Icon/Icon";
/**
 * Drawer — выдвигающаяся панель (side drawer/modal).
 *
 * Описание:
 * - Рендерится в document.body через createPortal.
 * - Покрывает весь экран полупрозрачным оверлеем и отображает панель с контентом сбоку.
 * - Блокирует прокрутку body, пока открыт.
 * - Закрывается по клику вне панели, по клику на оверлей/крестик и по нажатию Escape.
 *
 * Props:
 * @param {boolean} isOpen - Флаг открытия. Если false — компонент ничего не рендерит.
 * @param {function} onClose - Коллбек закрытия, вызывается при попытке закрыть панель.
 * @param {"right"|"left"} [align="right"] - Выравнивание панели (справа или слева).
 * @param {string} [title] - Заголовок панели (опционально). Отображается в header.
 * @param {React.ReactNode} [children] - Контент панели.
 *
 * Поведение и детали реализации:
 * - Сайдбар рендерится в <aside> и получает ref (drawerRef) для определения кликов вне панели.
 * - Обработчик handleClick закрывает панель, если клик был вне drawer и не был кликнув по модальным элементам с data-modal / data-modal-overlay.
 * - Escape — закрывает панель через onClose.
 * - При isOpen: добавляются глобальные слушатели mousedown и keydown и body.style.overflow = "hidden".
 *   При размонтировании/закрытии — слушатели удаляются и overflow сбрасывается в "unset".
 * - Оверлей перехватывает клики: он вызывает closeDrawer при onMouseDown.
 * - Внутри aside onMouseDown предотвращает всплытие, чтобы клики внутри панели не закрывали её.
 *
 * Accessibility (A11y):
 * - Оверлей имеет data-modal-overlay и aria-hidden для указания, что он декоративен.
 * - Кнопка закрытия имеет aria-label="Close".
 */
export const Drawer = ({
  isOpen,
  onClose,
  children,
  align = "right",
  title,
}) => {
  const drawerRef = useRef(null);

  // вызвать onClose если доступно
  const closeDrawer = useCallback(() => {
    onClose && onClose();
  }, [onClose]);

  // обработчик кликов по документу: если клик вне drawer и не по модальному элементу — закрыть
  const handleClick = useCallback(
    (event) => {
      if (drawerRef?.current && !drawerRef.current.contains(event?.target)) {
        const isModalClick =
          event?.target?.closest?.("[data-modal-overlay]") ||
          event?.target?.closest?.("[data-modal]");
        if (!isModalClick) closeDrawer();
      }
    },
    [drawerRef, closeDrawer],
  );

  // Escape закрывает панель
  const handleKeyPress = useCallback(
    (event) => {
      if (event?.key === "Escape") {
        onClose && onClose();
      }
    },
    [onClose],
  );

  // включает глобальные слушатели и блокировку прокрутки при открытом Drawer и всегда убирает слушатели и сбрасывает блокировку при закрытии/размонтировании.
  useEffect(() => {
    if (isOpen) {
      // добавляет глобальный обработчик кликов мышью; нужен чтобы закрыть панель, если пользователь кликнул вне неё
      document.addEventListener("mousedown", handleClick);
      // добавляет глобальный обработчик клавиш; нужен чтобы закрыть панель по Escape
      document.addEventListener("keydown", handleKeyPress);
      //  блокирует прокрутку страницы (убирает скролл на body) пока панель открыта
      document.body.style.overflow = "hidden";
    }
    // очистка (снятие слушателя) (return () => { ... }) выполняется
    return () => {
      // перед повторным выполнением эффекта (например, когда isOpen, handleClick или handleKeyPress изменятся) и при размонтировании компонента
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyPress);
      // возвращает поведение прокрутки к исходному (сбрасывает значение overflow)
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleClick, handleKeyPress]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-40" data-modal-overlay>
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onMouseDown={() => closeDrawer()}
      />
      {/* сама панель */}
      <aside
        ref={drawerRef}
        data-modal
        className={`fixed top-0 bottom-0 ${align === "right" ? "right-0" : "left-0"} z-50 w-full sm:w-2/3 md:w-1/2 lg:w-2/5 xl:w-1/4 bg-white shadow-xl transform transition-transform duration-300`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between p-6 border-b">
          <div>
            {title && <h2 className="text-xl font-semibold">{title}</h2>}
          </div>
          <button
            onClick={closeDrawer}
            className="ml-4 text-gray-500 hover:text-gray-800 rounded-md p-2"
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </header>

        <main
          className="p-6 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 96px)" }}
        >
          {children}
        </main>
      </aside>
    </div>,
    document.body,
  );
};
