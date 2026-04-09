import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { CartProvider } from "./context/cart/CartProvider.jsx";
import { AuthProvider } from "./context/auth/AuthProvider.jsx";
import { SavedProvider } from "./context/save/SavedProvider.jsx";

const safeLazy = (importFn, namedExport) =>
  lazy(() =>
    importFn().then((m) => {
      try {
        console.log("[safeLazy] importFn:", importFn.toString());
        if (m && typeof m === "object") {
          console.log("[safeLazy] module keys:", Object.keys(m));
          for (const k of Object.keys(m)) {
            console.log(`[safeLazy] module[${k}] type:`, typeof m[k]);
          }
        } else {
          console.log("[safeLazy] module type:", typeof m);
        }
      } catch (err) {
        console.warn("[safeLazy] logging failed", err);
      }

      if (m && m.default !== undefined) return m;
      if (namedExport && m && m[namedExport])
        return { default: m[namedExport] };
      if (m && m.Page) return { default: m.Page };
      if (m && m.App) return { default: m.App };
      if (m && m.Component) return { default: m.Component };
      throw new Error(
        "safeLazy: module does not provide a default export — check import " +
          importFn.toString(),
      );
    }),
  );

const Home = safeLazy(() => import("./pages/Home.jsx"));
const Shop = safeLazy(() => import("./pages/Shop.jsx"));
const Blog = safeLazy(() => import("./pages/Blog.jsx"));
const BlogDetails = safeLazy(() => import("./pages/BlogDetails.jsx"));
const OurStory = safeLazy(() => import("./pages/OurStory.jsx"));
const Contact = safeLazy(() => import("./pages/Contact.jsx"));
const Privacy = safeLazy(() => import("./pages/Privacy.jsx"));
const ProductDetails = safeLazy(() => import("./pages/ProductDetails.jsx"));
const Cart = safeLazy(() => import("./pages/Cart.jsx"));
const Checkout = safeLazy(() => import("./pages/Checkout.jsx"));
const OrderDetails = safeLazy(() => import("./pages/OrderDetails.jsx"));
const Page404 = safeLazy(() => import("./pages/Page404.jsx"));
const Account = safeLazy(() => import("./pages/auth/Account.jsx"));
const ResetPassword = safeLazy(() => import("./pages/auth/ResetPassword.jsx"));
const Admin = safeLazy(() => import("./pages/admin/Admin.jsx"));

import LoadingFallback from "./components/ui/LoadingFallback/LoadingFallback.jsx";

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
      { path: "orderDetails/:id", element: <OrderDetails /> },
      { path: "admin", element: <Admin /> },
      { path: "*", element: <Page404 /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <AuthProvider>
    {" "}
    <SavedProvider>
      {" "}
      <CartProvider>
        {" "}
        <Suspense fallback={<LoadingFallback />}>
          {" "}
          <RouterProvider router={router} />{" "}
        </Suspense>{" "}
      </CartProvider>{" "}
    </SavedProvider>{" "}
  </AuthProvider>,
);
