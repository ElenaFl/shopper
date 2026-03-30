import React from "react";
import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../Icon/Icon";
/**
 * Компонент выдвигающейся панели.
 * props:
 *  - isOpen: boolean
 *  - onClose: function
 *  - align: "right" | "left"
 *  - title: string
 *  - children: ReactNode
 */
export const Drawer = ({
  isOpen,
  onClose,
  children,
  align = "right",
  title,
}) => {
  const drawerRef = useRef(null);

  const closeDrawer = useCallback(() => {
    onClose && onClose();
  }, [onClose]);

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

  const handleKeyPress = useCallback(
    (event) => {
      if (event?.key === "Escape") {
        onClose && onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKeyPress);
      // lock body scroll
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyPress);
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
