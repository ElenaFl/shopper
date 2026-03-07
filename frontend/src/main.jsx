/**main.jsx настраивает маршруты и монтирует приложение, оборачивая его в CartProvider и SearchProvider */
import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Home } from "./components/pages/Home.jsx";
import { Shop } from "./components/pages/Shop.jsx";
import { Blog } from "./components/pages/Blog.jsx";
import { BlogDetails } from "./components/pages/BlogDetails.jsx";
import { OurStory } from "./components/pages/OurStory.jsx";
import { Contact } from "./components/pages/Contact.jsx";
import { Privacy } from "./components/pages/Privacy.jsx";
import { ProductDetails } from "./components/pages/ProductDetails.jsx";
import { Cart } from "./components/pages/Cart.jsx";
import { Categories } from "./components/pages/Categories.jsx";
import { Checkout } from "./components/pages/Checkout.jsx";
import { OrderDetails } from "./components/pages/OrderDetails.jsx";
import { Page404 } from "./components/pages/Page404.jsx";
import App from "./App.jsx";
import "./index.css";
import { Account } from "./components/pages/auth/Account.jsx";
import { AccountLayout } from "./components/pages/auth/AccountLayout.jsx";
import { AccountDashboard } from "./components/pages/auth/AccountDashboard.jsx";
import { AccountOrders } from "./components/pages/auth/AccountOrders.jsx";
import { AccountDownloads } from "./components/pages/auth/AccountDownloads.jsx";
import { AccountAddresses } from "./components/pages/auth/AccountAddresses.jsx";
import { AccountDetails } from "./components/pages/auth/AccountDetails.jsx";
import { AccountLogout } from "./components/pages/auth/AccountLogout.jsx";
import { ResetPassword } from "./components/pages/auth/ResetPassword.jsx";
import { CartProvider } from "./context/cart/CartProvider.jsx";
import { SearchProvider } from "./context/search/SearchProvider.jsx";

// Определение маршрутов
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { path: "", element: <Home /> },
      { path: "shop", element: <Shop /> },
      { path: "blog", element: <Blog /> },
      { path: "blog/:id", element: <BlogDetails /> },
      { path: "story", element: <OurStory /> },
      { path: "categories", element: <Categories /> },
      { path: "contact", element: <Contact /> },
      { path: "privacy", element: <Privacy /> },
      { path: "account", element: <Account /> },
      { path: "account-dashboard", element: <AccountLayout />,
        children: [
          { index: true, element: <AccountDashboard /> },
          { path: "orders", element: <AccountOrders /> },
          { path: "downloads", element: <AccountDownloads /> },
          { path: "addresses", element: <AccountAddresses /> },
          { path: "details", element: <AccountDetails /> },
          { path: "logout", element: <AccountLogout /> },
        ],
      },
      { path: "reset-password", element: <ResetPassword /> },
      { path: "products/:id", element: <ProductDetails /> },
      { path: "cart", element: <Cart /> },
      { path: "checkout", element: <Checkout /> },
      { path: "orderDetails", element: <OrderDetails /> },
      { path: "*", element: <Page404 /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  //глобальные провайдеры обеспечивают доступность контекста во всём приложении
  <CartProvider>
    <SearchProvider>
      <RouterProvider router={router} />
    </SearchProvider>
  </CartProvider>,
);
