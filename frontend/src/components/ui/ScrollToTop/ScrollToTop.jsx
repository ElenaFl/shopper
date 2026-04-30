import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const ScrollToTop = ({ top = 0 }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Быстрый переход наверх при смене пути
    window.scrollTo({ top, left: 0, behavior: "auto" });
  }, [pathname, top]);

  return null;
};

export default ScrollToTop;
