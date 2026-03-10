import React, { useContext } from "react";
import { Search } from "../components/ui/Search/Search.jsx";
import { SearchContext } from "../context/search/SearchContext";
import { NavLink } from "react-router-dom";

export const Blog = () => {
  const { query, setQuery } = useContext(SearchContext);
  return (
    <div className="mt-55 mb-62">
      <h1 className="text-[33px] font-medium mb-9">Blog</h1>
      {/* общий блок */}
      <div className="flex justify-between gap-x-10">
        {/* левый блок */}
        <div className="w-[21%]">
          <div className="mb-16">
            <Search
              value={query}
              onChange={setQuery}
              onSubmit={(v) => setQuery(v)}
            />
          </div>
          <h3 className="text-xl mb-11">Categories</h3>
          <nav className="flex flex-col text-[#707070]">
            <NavLink to="#" className="mb-2.5">
              Fashion
            </NavLink>
            <NavLink to="#" className="mb-2.5">
              Style
            </NavLink>
            <NavLink to="#" className="mb-2.5">
              Accessories
            </NavLink>
            <NavLink to="#">Season</NavLink>
          </nav>
        </div>
        {/* правый блок */}
        <div className="w-[76%] flex items-center justify-between flex-wrap gap-x-10 gap-y-16">
          {/* карточка */}
          <div className="w-112.5">
            <div className="w-full mb-6">
              <img
                className="w-full h-75 object-cover"
                src="/images/blog12.jpg"
                alt="watch"
              />
            </div>
            <div className="mb-1.5 text-sm text-[#707070]">
              Fashion - October 8, 2020
            </div>
            <h3 className="mb-4 text-xl">Top Trends From Spring</h3>
            <p className="mb-6 text-[#707070]">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. faucibus
              augue, a maximus elit ex vitae libero...{" "}
            </p>
            <span className="text-[#A18A68] font-bold">Read More</span>
          </div>
          {/* карточка */}
          <div className="w-112.5">
            <div className="w-full mb-6">
              <img
                className="w-full h-75 object-cover"
                src="/images/blog13.jpg"
                alt="watch"
              />
            </div>
            <div className="mb-1.5 text-sm text-[#707070]">
              Fashion - October 8, 2020
            </div>
            <h3 className="mb-4 text-xl">Top Trends From Spring</h3>
            <p className="mb-6 text-[#707070]">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. faucibus
              augue, a maximus elit ex vitae libero...{" "}
            </p>
            <span className="text-[#A18A68] font-bold">Read More</span>
          </div>
          {/* карточка */}
          <div className="w-112.5">
            <div className="w-full mb-6">
              <img
                className="w-full h-75 object-cover"
                src="/images/blog14.jpg"
                alt="watch"
              />
            </div>
            <div className="mb-1.5 text-sm text-[#707070]">
              Fashion - October 8, 2020
            </div>
            <h3 className="mb-4 text-xl">Top Trends From Spring</h3>
            <p className="mb-6 text-[#707070]">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. faucibus
              augue, a maximus elit ex vitae libero...{" "}
            </p>
            <span className="text-[#A18A68] font-bold">Read More</span>
          </div>
          {/* карточка */}
          <div className="w-112.5">
            <div className="w-full mb-6">
              <img
                className="w-full h-75 object-cover"
                src="/images/blog15.jpg"
                alt="watch"
              />
            </div>
            <div className="mb-1.5 text-sm text-[#707070]">
              Fashion - October 8, 2020
            </div>
            <h3 className="mb-4 text-xl">Top Trends From Spring</h3>
            <p className="mb-6 text-[#707070]">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. faucibus
              augue, a maximus elit ex vitae libero...{" "}
            </p>
            <span className="text-[#A18A68] font-bold">Read More</span>
          </div>
        </div>
      </div>
    </div>
  );
};
