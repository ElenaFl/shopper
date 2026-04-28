/**main.jsx настраивает маршруты и монтирует приложение, оборачивая его в CartProvider и SearchProvider */
import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Home } from "./pages/Home.jsx";
import { Shop } from "./pages/Shop.jsx";
import { Blog } from "./pages/Blog.jsx";
import { BlogDetails } from "./pages/BlogDetails.jsx";
import { OurStory } from "./pages/OurStory.jsx";
import { Contact } from "./pages/Contact.jsx";
import { Privacy } from "./pages/Privacy.jsx";
import { ProductDetails } from "./pages/ProductDetails.jsx";
import { Cart } from "./pages/Cart.jsx";
import { Checkout } from "./pages/Checkout.jsx";
import { OrderDetails } from "./pages/OrderDetails.jsx";
import { Page404 } from "./pages/Page404.jsx";
import App from "./App.jsx";
import "./index.css";
import { Account } from "./pages/auth/Account.jsx";
import { ResetPassword } from "./pages/auth/ResetPassword.jsx";
import { CartProvider } from "./context/cart/CartProvider.jsx";
import { AuthProvider } from "./context/auth/AuthProvider.jsx";
import { Admin } from "./pages/admin/Admin.jsx";
import { SavedProvider } from "./context/save/SavedProvider.jsx";

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
      { path: "contact", element: <Contact /> },
      { path: "privacy", element: <Privacy /> },
      { path: "account", element: <Account /> },
      { path: "reset-password", element: <ResetPassword /> },
      { path: "products/:id", element: <ProductDetails /> },
      { path: "cart", element: <Cart /> },
      { path: "checkout", element: <Checkout /> },
      { path: "orderDetails", element: <OrderDetails /> },
      { path: "*", element: <Page404 /> },
      { path: "admin", element: <Admin /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  //глобальные провайдеры обеспечивают доступность контекста во всём приложении
  <CartProvider>
    <AuthProvider>
      <SavedProvider>
        <RouterProvider router={router} />
      </SavedProvider>
    </AuthProvider>
  </CartProvider>,
);
