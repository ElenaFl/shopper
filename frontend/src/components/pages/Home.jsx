import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { SwiperComponent } from "../../components/ui/SwiperComponent/SwiperComponent.jsx";
import { Card } from "../../components/ui/Card/Card.jsx";
import { data } from "../../../data.js";
import { categories } from "../../../categories.js";
import { SearchContext } from "../../context/search/SearchContext.jsx";

const showAllTerms = ["all categories", "all", "все категории", "все"];

export const Home = () => {
  const navigate = useNavigate();
  const { query } = useContext(SearchContext);

  const normalized = (s) => (s || "").toLowerCase().trim();

  // Создаём map категорий
  const categoriesMap = new Map();
  categories.forEach((c) => categoriesMap.set(c.id, c));

  // Фильтрация по query
  const q = normalized(query);
  let filtered;
  if (!q) {
    filtered = data;
  } else if (showAllTerms.includes(q)) {
    filtered = data;
  } else {
    filtered = data.filter((item) => {
      const titleMatch = (item.title || "").toLowerCase().includes(q);
      const catTitle = (categoriesMap.get(item.category_id)?.title || "")
        .toLowerCase()
        .includes(q);
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

// import React, { useMemo, useContext } from "react";
// import { NavLink, useNavigate } from "react-router-dom";
// import { SwiperComponent } from "../../components/ui/SwiperComponent/SwiperComponent.jsx";
// import { Card } from "../../components/ui/Card/Card.jsx";
// import { data } from "../../../data.js";
// import { categories } from "../../../categories.js";
// import { useDebounce } from "../../hooks/useDebounce.js";
// import { SearchContext } from "../../context/search/SearchContext.jsx";

// const showAllTerms = ["all categories", "all", "все категории", "все"];

// export const Home = () => {
//   const navigate = useNavigate();
//   const { query } = useContext(SearchContext);
//   const debouncedQuery = useDebounce(query, 300);

//   const normalized = (s) => (s || "").toLowerCase().trim();

//   const categoriesMap = useMemo(() => {
//     const m = new Map();
//     categories.forEach((c) => m.set(c.id, c));
//     return m;
//   }, []);

//   const filtered = useMemo(() => {
//     const q = normalized(debouncedQuery);
//     if (!q) return data;
//     if (showAllTerms.includes(q)) return data;

//     // Global search: match product title OR category title
//     return data.filter((item) => {
//       const titleMatch = (item.title || "").toLowerCase().includes(q);
//       const catTitle = (categoriesMap.get(item.category_id)?.title || "")
//         .toLowerCase()
//         .includes(q);
//       return titleMatch || catTitle;
//     });
//   }, [debouncedQuery, categoriesMap]);

//   return (
//     <>
//       <SwiperComponent />

//       <div className="mt-16 mb-10 w-full flex justify-between items-center">
//         <h2 className="text-3xl font-medium">Shop The Latest</h2>
//         <NavLink
//           to="/shop"
//           className="btn text-xl font-medium text-[#A18A68] hover:text-[#070707]"
//         >
//           View All
//         </NavLink>
//       </div>

//       <div className="mt-10 mb-62.5 flex justify-start flex-wrap gap-13">
//         {filtered && filtered.length > 0 ? (
//           filtered.map((product) => (
//             <Card
//               details={product}
//               key={product.id}
//               onOpenDetails={() => navigate(`/card-details/${product.id}`)}
//               size={{
//                 width: 380,
//                 height: 472,
//                 heightImg: 380,
//               }}
//             />
//           ))
//         ) : (
//           <div className="w-full text-center py-16 text-gray-500">
//             No products found
//           </div>
//         )}
//       </div>
//     </>
//   );
// };
