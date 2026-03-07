import React, { useEffect, useState } from "react";
import { CartContext } from "./CartContext.jsx";
import { Alert } from "../../components/ui/Alert/Alert.jsx";


//ключ, под которым в локальном хранилище сохраняются данные корзины
const LOCAL_STORAGE_KEY = "shopper_cart";

/**
 * CartProvider — провайдер корзины.
 *
 * Хранит состояние корзины, синхронизирует с localStorage и предоставляет
 * методы для добавления/удаления/обновления количества товара.
 *
 * Используются числовые id для товаров, при сравнении id приводится к Number.
 */

//children - компоненты, которым нужен доступ к cart‑context и которые рендерятся внутри провайдера
export const CartProvider = ({ children }) => {
  //инициалицация корзины при начале сессии из локального хранилища
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Не удалось разобрать корзину из localStorage:", e);
      return [];
    }
  });

  // локальное состояние для Alert (текущее сообщение)
  const [alert, setAlert] = useState({
    isOpen: false,
    variant: "neutral",
    title: "",
    subtitle: "",
  });

  // синхронизация cart → localStorage при изменениях
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error("Не удалось сохранить корзину в localStorage:", e);
    }
  }, [cart]);

  // утилита: нормализовать id к числу для безопасных сравнений
  const toNum = (v) => {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  // функция для показа alert
  const showAlert = ({ variant = "neutral", title = "", subtitle = "" }) => {
    setAlert({ isOpen: true, variant, title, subtitle });
  };

  /**
   * addToCart(item)
   * - item: объект товара, ожидается, что item.id присутствует (number/string)
   * - Если товар уже есть в корзине — увеличиваем quantity (или задаём).
   * - Если товара нет — добавляем с quantity (по умолчанию 1).
   *
   * NOTE: при добавлении мы явно сохраняем id как number (если возможно).
   */
  const addToCart = (item) => {
    if (!item || item.id == null) {
      console.warn("addToCart: неверный item", item);
      showAlert({
        variant: "error",
        title: "Ошибка",
        subtitle: "Некорректный товар",
      });
      return;
    }

    const itemId = toNum(item.id);
    if (itemId === null) {
      console.warn("addToCart: id не является числом:", item.id);
      showAlert({
        variant: "error",
        title: "Ошибка",
        subtitle: "ID товара должен быть числом",
      });
      return;
    }

    //флаг addedNew - его цель — после вызова setCart понять, добавлен ли новый товар (addedNew === true) или только увеличилось количество существующего в корзине
    let addedNew = false;
    //вызов setCart с функциональным обновлением
    //prev — текущее значение cart на момент вызова
    setCart((prev) => {
      //поиск и проверка: существует ли такой товар в корзине?
      const existing = prev.find((i) => toNum(i.id) === itemId);
      if (existing) {
        //если есть -  для совпадающего товара создаём новый объект с увеличенным количеством: берем текущее i.quantity (или 1, если его нет) и прибавляем item.quantity (или 1)
        const updated = prev.map((i) =>
          toNum(i.id) === itemId
            ? //спредим объект товара и явно перезаписываем количество
              { ...i, quantity: (i.quantity || 1) + (item.quantity || 1) }
            : i,
        );
        //возвращаем updated — это новый массив станет новым состоянием cart
        return updated;
      }
      //eсли товара нет - добавляем товар, как новый
      //устанавливаем флаг нового товара в true
      addedNew = true;
      //cоздаём новый массив, копируя prev и добавлем новый объект товара...item
      //затем явно перезаписываем поля id: itemId(сразу приводится к Number)
      //quantity: item.quantity || 1 - если нет количества оно устанавливается равным 1
      return [...prev, { ...item, id: itemId, quantity: item.quantity || 1 }];
    });

    // Показываем уведомление об успешном добавлении.
    // Если добавлен новый товар — более явное сообщение
    if (addedNew) {
      showAlert({
        variant: "success",
        title: "Добавлено в корзину",
        subtitle: item.title || "",
      });
    } else {
      showAlert({
        variant: "success",
        title: "Количество обновлено",
        subtitle: item.title || "",
      });
    }
  };

  /**
   * removeFromCart(itemId)
   * - Удаляет товар по id. itemId может быть числом или строкой.
   */
  const removeFromCart = (itemId) => {
    const idNum = toNum(itemId);
    if (idNum === null) {
      // Если id некорректен — ничего не делаем
      console.warn("removeFromCart: неверный itemId", itemId);
      showAlert({
        variant: "error",
        title: "Ошибка",
        subtitle: "Некорректный ID",
      });
      return;
    }

    // Найдём удаляемый товар, чтобы показать его название в уведомлении
    const toRemove = cart.find((i) => toNum(i.id) === idNum);
    setCart((prev) => prev.filter((i) => toNum(i.id) !== idNum));

    // Показать уведомление (если товар был в корзине)
    if (toRemove) {
      showAlert({
        variant: "info",
        title: "Удалено из корзины",
        subtitle: toRemove.title || "",
      });
    }
  };

  /**
   * updateQuantity(itemId, quantity)
   * - Если quantity <= 0 — удаляет товар.
   * - Иначе — обновляет quantity.
   */
  const updateQuantity = (itemId, quantity) => {
    const idNum = toNum(itemId);
    if (idNum === null) {
      console.warn("updateQuantity: неверный itemId", itemId);
      showAlert({
        variant: "error",
        title: "Ошибка",
        subtitle: "Некорректный ID",
      });
      return;
    }

    setCart((prev) => {
      if (quantity <= 0) {
        // удаляем и показываем уведомление
        const toRemove = prev.find((i) => toNum(i.id) === idNum);
        const next = prev.filter((i) => toNum(i.id) !== idNum);
        if (toRemove) {
          showAlert({
            variant: "info",
            title: "Удалено из корзины",
            subtitle: toRemove.title || "",
          });
        }
        return next;
      }
      // обновляем количество
      const updated = prev.map((i) =>
        toNum(i.id) === idNum ? { ...i, quantity } : i,
      );
      showAlert({
        variant: "success",
        title: "Количество обновлено",
        subtitle: "",
      });
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    showAlert({ variant: "info", title: "Корзина очищена", subtitle: "" });
  };

  return (
    // компонент экспортирует в value контекста: cart, addToCart, removeFromCart, updateQuantity, clearCart.
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart }}
    >
      {/* pендерит дочерние компоненты и компонент Alert с текущим сообщением. */}
      {children}
      <Alert
        variant={alert.variant}
        isOpen={alert.isOpen}
        title={alert.title}
        subtitle={alert.subtitle}
        onClose={() => setAlert((s) => ({ ...s, isOpen: false }))}
      />
    </CartContext.Provider>
  );
};
