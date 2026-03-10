import React, { useContext, useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { SwiperComponent } from "../components/ui/SwiperComponent/SwiperComponent.jsx";
import { Card } from "../components/ui/Card/Card.jsx";
//статический массив продуктов из data.js
// import { data } from "../../data.js";
//статический массив категорий из categories.js
// import { categories } from "../../categories.js";
import { SearchContext } from "../context/search/SearchContext.jsx";

// массив строк, при вводе которых в поисковую строку отображаются все продукты
const showAllTerms = ["all categories", "all", "все категории", "все"];

/**
 * Страица Номе.
 *
 * Глобальный поиск по PRODUCTS и CATEGORIES: находим товары по title, а также категории по title, а затем показываем товары из выбранной категории по соответствующим category_id.
 */

export const Home = () => {
  //инициализация состояния массива categories, обновляется после fetch
  const [categories, setCategories] = useState([]);
  //инициализация состояния массива products, обновляется после fetch
  const [products, setProducts] = useState([]);

  //вызов хука вазвращает ф-ю, кот позволяет программно переходить на др марш-т без  клика по ссылке
  const navigate = useNavigate();

  //берём текст из поискового запроса
  const { query } = useContext(SearchContext);

  //объявляем и присваиваем ф-ю для нормализации текста из поисковой строки, для сравнения
  const normalized = (s) => (s || "").toLowerCase().trim();

  useEffect(() => {
    //метод отправляет HTTP GET-запрос по указанному URL; опция- credentials: "include" - для обмена клиента и сервера кукками
    fetch("http://shopper.local/api/categories", { credentials: "include" })
      .then((res) => {
        //логируем в консоли статус ответа
        console.log("fetch status categories", res.status);
        //вызывается res.json(), который читает тело ответа и парсит его как JSON
        return res.json();
      })
      //data — результат парсинга JSON (массив JS), передаётся в состояние setCategories.
      .then((categories) => {
        console.log("fetch categories", categories);
        setCategories(categories);
      })
      .catch((err) => console.error("fetch error categories", err));
  }, []);

  useEffect(() => {
    fetch("http://shopper.local/api/products", { credentials: "include" })
      .then((res) => {
        console.log("fetch status products", res.status);
        return res.json();
      })
      .then((products) => {
        console.log("fetch rpoducts", products);
        setProducts(products);
      })
      .catch((err) => console.error("fetch error products", err));
  }, []);

  // создаём экз-р класса Map(объект-коллекция)
  const categoriesMap = new Map();
  //в перемен записываем пары из массива категорий: 1=>{id:1, title:"..."}
  categories.forEach((c) => categoriesMap.set(c.id, c));

  //переменная сохраняет нормализованный текст для фильтрации товаров(категорий товаров)
  const q = normalized(query);

  //переменная для сохранения массива отфильтрованных товаров по запросу
  let filtered = [];

  //если текст в поисковой строке отсутствует
  if (!q) {
    //отображаются все товары
    filtered = products;
    //или если поисковый запрос содержит текст из массива showAllTerms
  } else if (showAllTerms.includes(q)) {
    //отображаются все товары
    filtered = products;
    //иначе происходит фильтрация товаров по наименованию и по наименованию категории
  } else {
    //берется элемент массива data (объект, содержащий сведния о товаре) и фильтруется с пом функции-предиката, кот возвр true или false
    filtered = products.filter((item) => {
      //наименование товара приводится к ниж регистру и проверяется на содержание текста запроса (если наименования у товара нет, оно считается ""), если содержит запрос, сохраняется в переменную
      const titleMatch = (item.title || "").toLowerCase().includes(q);
      //у проверяемого товара берется номер категории с пом categoriesMap.get(item.category_id)?.title устанавливается наименование категории (или "", если не указана)
      const catTitle = (categoriesMap.get(item.category_id)?.title || "")
        .toLowerCase()
        //если наименование категории содержит текст поискового запроса, товар сохраняется в переменную
        .includes(q);
      //если совпадение найдено в наименовании товара или в наименовании категории, предикат возвращает true — товар попадёт в filtered
      return titleMatch || catTitle;
    });
  }

  return (
    <>
      <SwiperComponent />

      <div className="mt-16 mb-10 w-full flex justify-between items-center">
        <h2 className="text-3xl font-medium">Shop The Latest</h2>
        <NavLink
          to="/shop"
          className="btn text-xl font-medium text-[#A18A68] hover:text-[#070707]"
        >
          View All
        </NavLink>
      </div>

      <div className="mt-10 mb-62.5 flex justify-start flex-wrap gap-13">
        {filtered && filtered.length > 0 ? (
          filtered.map((product) => (
            <Card
              details={product}
              key={product.id}
              onOpenDetails={() => navigate(`/card-details/${product.id}`)}
              size={{
                width: 380,
                height: 472,
                heightImg: 380,
              }}
            />
          ))
        ) : (
          <div className="w-full text-center py-16 text-gray-500">
            No products found
          </div>
        )}
      </div>
    </>
  );
};
