import React from "react";
import { NavLink } from "react-router-dom";

/**
 * Footer — компонент нижнего колонтитула приложения.
 *
 * Описание:
 * - Отображает навигационные ссылки, подписку на рассылку и иконки социальных сетей.
 * - Структура состоит из двух основных строк: верхней с навигацией и подпиской и нижней с правовой информацией и иконкой соцсети.
 *
 * Структура/вёрстка:
 * - Корневой <footer> содержит два блока:
 *   1) Верхний блок: flex-контейнер с навигацией слева и формой подписки (текст + кнопка) справа.
 *   2) Нижний блок: flex-контейнер с текстом авторских прав слева и кнопкой соцсети справа.
 * - Навигация реализована через NavLink из react-router-dom для активных ссылок.
 *
 */

export const Footer = () => {
  return (
    <footer>
      <div className="flex justify-between text-4/6.75 text-[#707070] border-t-2 border-gray-200">
        <nav className=" flex justify-between gap-x-7.75">
          <NavLink to="/contact" className="hover:text-[#A18A68] pt-13.25">
            CONTACT
          </NavLink>
          <NavLink to="#" className="hover:text-[#A18A68] pt-13.25">
            TERMS OF SERVICES
          </NavLink>
          <NavLink to="#" className="hover:text-[#A18A68] pt-13.25">
            SHIPPING AND RETURNS
          </NavLink>
        </nav>
        <div className="flex justify-between gap-x-32 border-b-2 border-gray-600">
          <p className="pt-10">Give an email, get the newsletter.</p>
          <button className="btn pt-10">
            <img src="/images/arrow.svg" alt="arrow" />
          </button>
        </div>
      </div>
      <div className="flex justify-between pt-12.5 mb-22.5">
        <p className="text-4/6.75 text-[#707070]">
          {" "}
          &copy; 2026 Terms of use <span className="text-black">and</span>{" "}
          privacy policy.
        </p>
        <button className="btn">
          <img src="/images/instagram.svg" alt="instagram" />
        </button>
      </div>
    </footer>
  );
};
