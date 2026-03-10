import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Counter } from "../components/ui/Counter/Counter.jsx";
import { Button } from "../components/ui/Button/Button.jsx";
import { Tabs } from "../components/ui/Tabs/Tabs.jsx";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import { data } from "../../data.js";
import { categories } from "../../categories.js";
import { CartContext } from "../context/cart/CartContext.jsx";
import { Card } from "../components/ui/Card/Card.jsx";

/**
 * Компонент страница ProductDetails.
 */

const DISABLED_FLAG_KEY = "pd_disabled_flags_v1"; // объект в localStorage: { [productId]: true }

export const ProductDetails = () => {
  const { id } = useParams();
  const { cart, addToCart, updateQuantity } = useContext(CartContext);

  const productId = Number(id);
  const product = data.find((item) => item.id === productId);

  // состояние вкладок — хуки должны быть в начале компонента
  const [activeCategory, setActiveCategory] = useState("Description");

  // Поиск элемента в cart и вычисление начального количества
  const existing = cart.find((i) => Number(i.id) === productId);
  const derivedCount = existing ? Number(existing.quantity) : 1;

  // Ленивая инициализация local на основе cart (чтобы не вызывать setState в эффекте)
  const [local, setLocal] = useState(() => ({
    count: derivedCount,
    isAdded: Boolean(existing),
  }));

  // Эффект: синхронизация persist флага в localStorage и синхронизация local с cart при изменениях
  useEffect(() => {
    const inCart = cart.find((i) => Number(i.id) === productId);

    // persist флага добавления в localStorage (если нужно)
    try {
      const raw = localStorage.getItem(DISABLED_FLAG_KEY);
      const map = raw ? JSON.parse(raw) : {};
      if (inCart) {
        if (!map[productId]) {
          map[productId] = true;
          localStorage.setItem(DISABLED_FLAG_KEY, JSON.stringify(map));
        }
      } else {
        if (map[productId]) {
          delete map[productId];
          localStorage.setItem(DISABLED_FLAG_KEY, JSON.stringify(map));
        }
      }
    } catch {
      // ignore localStorage errors
    }

    // Синхронизация состояния local только при необходимости
    const next = inCart
      ? { count: Number(inCart.quantity) || 0, isAdded: true }
      : { count: 1, isAdded: false };

    setLocal((prev) => {
      if (prev.count === next.count && prev.isAdded === next.isAdded) {
        return prev; // ничего не меняем, чтобы избежать лишнего рендера
      }
      return next;
    });
  }, [cart, productId]);

  // persist флага добавления (сохранение/удаление) — утилита для обработчиков
  const persistAddedFlag = (pid, val) => {
    try {
      const raw = localStorage.getItem(DISABLED_FLAG_KEY);
      const map = raw ? JSON.parse(raw) : {};
      if (val) map[pid] = true;
      else delete map[pid];
      localStorage.setItem(DISABLED_FLAG_KEY, JSON.stringify(map));
    } catch {
      // ignore localStorage errors
    }
  };

  // Обработчик изменения счётчика
  const handleCounterChange = (newCount) => {
    const q = Number(newCount) || 0;
    setLocal((prev) => ({ ...prev, count: q }));

    if (q <= 0) {
      updateQuantity(productId, 0);
      setLocal((prev) => ({ ...prev, isAdded: false }));
      persistAddedFlag(productId, false);
      return;
    }

    const inCart = cart.find((i) => Number(i.id) === productId);
    if (inCart) {
      updateQuantity(productId, q);
      setLocal((prev) => ({ ...prev, isAdded: true }));
      persistAddedFlag(productId, true);
    } else {
      // Если товара ещё нет в корзине — не добавляем автоматически при изменении счётчика,
      // ожидаем нажатия ADD TO CART
    }
  };

  // Обработчик ADD TO CART
  const handleAddToCart = () => {
    const inCart = cart.find((i) => Number(i.id) === productId);
    if (inCart) {
      setLocal((prev) => ({ ...prev, isAdded: true }));
      persistAddedFlag(productId, true);
      return;
    }

    const qty = Number(local.count) > 0 ? Number(local.count) : 1;
    addToCart({ ...product, quantity: qty });
    setLocal((prev) => ({ ...prev, isAdded: true }));
    persistAddedFlag(productId, true);
    // навигация в /cart не выполняется здесь
  };

  // Классы/стили для кнопки и счётчика
  const addButtonClass = local.isAdded
    ? "w-90 h-13 font-semibold border rounded-sm cursor-not-allowed flex justify-center items-center text-center bg-white text-[#D8D8D8]"
    : "w-90 h-13 font-semibold border rounded-sm cursor-pointer flex justify-center items-center text-center bg-black text-white hover:bg-black hover:text-white";

  // В ProductDetails мы хотим единственную тонкую рамку — Counter сам рисует border
  const counterWrapperClass = "w-26 h-13 bg-white";

  // Получим название категории текущего товара
  const categoryObj = categories.find((c) => c.id === product?.category_id);
  const categoryTitle = categoryObj ? categoryObj.title : "";

  if (!product) {
    return (
      <div className="mt-31 pt-24">
        <div>Product not found</div>
      </div>
    );
  }

  // Similar: товары той же категории (исключая текущий), максимум 3
  const categoryId = product?.category_id;
  const similar = categoryId
    ? data
        .filter(
          (p) =>
            Number(p.category_id) === Number(categoryId) &&
            Number(p.id) !== Number(productId),
        )
        .slice(0, 3)
    : [];

  return (
    <div className="mt-60 mb-62">
      {/* верхний блок */}
      <div className="flex justify-between items-center gap-x-9px mb-10">
        {/* свайпер */}
        <div className="w-30">
          <div className="relative">
            <Swiper
              className="w-30 h-150 cursor-pointer absolute top-2 left-0"
              modules={[Pagination, Autoplay]}
              direction="vertical"
              pagination={{ clickable: true }}
              slidesPerView={4}
              centeredSlides={false}
              loop={true}
              autoplay={{ delay: 4000 }}
              spaceBetween={10}
              speed={600}
              touchRatio={1}
            >
              {data?.map((item) => (
                <SwiperSlide key={item.id}>
                  <div className="w-30 h-30 relative">
                    <img
                      src={`../../../${item.img}`}
                      alt={item.title}
                      className="w-full h-full rounded-sm"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
        {/* правый общий блок */}

        <div className="w-272 flex justify-between items-center gap-x-12px">
          {/* левый блок */}
          <div className="w-135 h-145">
            <img
              src={product?.img}
              alt={product?.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* правый блок */}
          <div className="w-121">
            <h3 className="text-2xl mb-6">{product.title}</h3>

            <p className="text-xl text-medium mb-16">
              {product?.currency} {product?.price?.toFixed(2)}
            </p>

            <div className="w-73 h-6 flex justify-between items-center mb-5">
              <div className="w-32.5 flex justify-between items-center cursor-pointer">
                {[...Array(5)].map((_, i) => (
                  <img key={i} src="/images/star.svg" alt="star" />
                ))}
              </div>
              <div className="w-34.5 flex justify-between items-center">
                <div>n</div>
                <div className="text-[#707070]">customer review</div>
              </div>
            </div>

            <p className="mb-12" style={{ color: "#707070" }}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam
              placerat, augue a volutpat hendrerit, sapien tortor faucibus
              augue, a maximus elit ex vitae libero. Sed quis mauris eget arcu
              facilisis consequat sed eu felis.
            </p>

            <div className="h-13 flex justify-between items-center mb-20">
              <div
                className={counterWrapperClass}
                aria-disabled={local.isAdded}
              >
                <Counter
                  count={local.count}
                  onChange={handleCounterChange}
                  className={local.isAdded ? "" : ""}
                />
              </div>
              <button
                onClick={handleAddToCart}
                className={addButtonClass}
                disabled={local.isAdded}
              >
                ADD TO CART
              </button>
            </div>

            <div className="w-60 h-4.5 mb-9 flex justify-between items-center ">
              <img
                src="/images/heart.svg"
                alt="heart"
                className="cursor-pointer"
              />
              <div>|</div>
              <img
                src="/images/instagram.svg"
                alt="instagram"
                className="cursor-pointer"
              />
            </div>

            <div>
              <span className="inline-block mr-4">SKU: </span>
              <span className="inline-block mb-4 text-[#707070]">
                {product?.SKU}
              </span>
            </div>

            <div>
              <span className="inline-block mr-4">Categories:</span>
              <span className="inline-block mb-4 text-[#707070]">
                {categoryTitle}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* нижний блок с Tabs */}
      <div className="w-[75%] text-xl">
        <Tabs
          categories={["Description", "Additional information", "Reviews(n)"]}
          activeCategory={activeCategory}
          onCategoryChange={(category) => setActiveCategory(category)}
          tabClassName="flex list-none gap-25 justify-start"
          tabItemClassName="inline-flex pl-0 items-center justify-center px-4 py-2 text-lg"
          activeClassName="text-black border-b-2 border-black"
          inactiveClassName="text-gray-500"
        />
      </div>

      {/* содержимое вкладок */}
      {/* Description */}
      {activeCategory === "Description" && (
        <div
          className="w-full mt-10 mb-24 text-[#707070] text-left"
          id="description-content"
        >
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam
            placerat, augue a volutpat hendrerit, sapien tortor faucibus augue,
            a maximus elit ex vitae libero. Sed quis mauris eget arcu facilisis
            consequat sed eu felis. Nunc sed porta augue. Morbi porta tempor
            odio, in molestie diam bibendum sed.
          </p>
        </div>
      )}
      {/* Additional information */}
      {activeCategory === "Additional information" && (
        <div
          className="w-full mt-10 mb-14 text-[#707070] text-left"
          id="information -content"
        >
          <ul>
            <li>
              <span className="inline-block mb-3 mr-4 text-black">Weight:</span>{" "}
              <span className="text-[#707070]">{product?.weight}</span>
            </li>
            <li>
              <span className="inline-block mb-3 mr-4 text-black">
                Dimentions:
              </span>{" "}
              <span className="text-[#707070]">{product?.dimentions}</span>
            </li>
            <li>
              <span className="inline-block mb-3 mr-4 text-black">
                Colours:
              </span>{" "}
              <span className="text-[#707070]">{product?.colours}</span>
            </li>
            <li>
              <span className="inline-block mb-3 mr-4 text-black">
                Material:
              </span>{" "}
              <span className="text-[#707070]">{product?.material}</span>
            </li>
          </ul>
        </div>
      )}
      {/* Reviews */}
      {activeCategory === "Reviews(n)" && (
        <div className="w-full mt-10 mb-21 text-[#707070]" id="reviews-content">
          {/* общий блок */}
          <div className="w-full mt-24 flex justify-between text-[#707070]">
            {/* левый блок */}
            <div className="w-[46%]">
              <h3 className="mb-13 text-xl">n Reviews for {product?.title}</h3>
              {/* карточка отзыва */}
              <div className="w-full pt-6 pb-10 border-b border-[#D8D8D8]">
                <div className="flex items-center gap-x-4 mb-4">
                  <h4 className="inline-block text-xl">Scarlet withch</h4>
                  <span className="text-sm text-[#707070]">Date</span>
                </div>
                <div className="mb-6">
                  <img src="/images/stars.png" alt="starc" />
                </div>
                <p className="text-[#707070]">
                  Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed
                  diam nonummy nibh euismod tincidunt ut laoreet.{" "}
                </p>
              </div>
            </div>

            {/* правый блок */}
            <div className="w-[46%]">
              <h3 className="mb-3 text-xl text-black">Add a Review</h3>
              <p className="mb-12 text-[13px]/[30px] text-[#707070]">
                Your email address will not be published. Required fields are
                marked *
              </p>
              <form className="text-sm text-[#707070]">
                <textarea
                  rows={3}
                  className="w-full mb-12 border-b border-[#D8D8D8]"
                  placeholder="Your Review*"
                  required
                />
                <div className="w-full">
                  <input
                    type="text"
                    name="name"
                    id="name"
                    className="w-full mb-12 pb-4 border-b border-[#D8D8D8]"
                    placeholder="Enter your name*"
                  />
                </div>
                <div className="w-full">
                  <input
                    type="email"
                    name="email"
                    id="email"
                    className="w-full mb-7 pb-4 border-b border-[#D8D8D8]"
                    placeholder="Enter your Email**"
                  />
                </div>
                {/* сохранить */}
                <div className="w-full flex gap-x-2 mb-12">
                  <input type="checkbox" id="save" className="w-4 h-4" />
                  <label htmlFor="save">
                    Save my name, email, and website in this browser for the
                    next time I comment
                  </label>
                </div>
                <p className="mb-3">Your Rating*</p>
                <div className="mb-12">
                  <img src="/images/stars.png" alt="stars" />
                </div>
                <div className="w-[22%]">
                  <Button color="black" name="Submit" />
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* похожие */}
      <h2 className="mb-12 text-[26px]">Similar Items</h2>
      <div className="w-full flex flex-wrap gap-6">
        {similar.length === 0 ? (
          <div className="text-gray-500">No similar items</div>
        ) : (
          similar.map((p) => (
            <div key={p.id} style={{ width: 380 }} className="min-w-55">
              <Card
                details={p}
                size={{ width: 380, height: 472, heightImg: 380 }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
