import React from "react";

export const BlogDetails = () => {
  const handleBtnOnInput = () => {};
  return (
    <div className="mt-55 mb-62">
      <h1 className="mb-4 text-[33px] text-center font-medium">
        Fast Fashion, And Faster Fashion
      </h1>
      <p className="text-xl text-center mb-12 text-[#7F7F7F]">
        by
        <b>
          <span className="text-black"> ANNY JOHNSON</span>
        </b>
        - Date
      </p>
      <div className="w-full h-auto mb-16">
        <img
          src="/images/blog01.jpg"
          alt="watch"
          className="w-full h-full object-cover rounded-md"
        />
      </div>
      <div className="w-2xl m-auto">
        <p className="mb-15">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam
          placerat, augue a volutpat hendrerit, sapien tortor faucibus augue, a
          maximus elit ex vitae libero. Sed quis mauris eget arcu facilisis
          consequat sed eu felis. Nunc sed porta augue. Lorem ipsum dolor sit
          amet, consectetur adipiscing elit. Aliquam placerat, augue a volutpat
          hendrerit, sapien tortor faucibus augue, a maximus elit ex vitae
          libero. Sed quis mauris eget arcu facilisis consequat sed eu felis.
        </p>
        <div className="w-full h-auto mb-12">
          <img
            src="/images/blog02.jpg"
            alt="beads"
            className="w-full h-full object-cover"
          />
        </div>
        <h2 className="mb-6 text-[26px]">Top trends</h2>
        <p className="mb-4">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam
          placerat, augue a volutpat hendrerit, sapien tortor faucibus augue, a
          maximus elit ex vitae libero.
        </p>
        <ul className="list-disc mb-23 pl-4 marker:text-gray-700">
          <li className="mb-4">
            consectetur adipiscing elit. Aliquam placerat
          </li>
          <li className="mb-4">Lorem ipsum dolor sit amet consectetur</li>
          <li className="mb-4">sapien tortor faucibus augue</li>
          <li className="mb-4">
            a maximus elit ex vitae libero. Sed quis mauris eget arcu facilisis
          </li>
        </ul>
        <div className="flex items-center justify-between mb-11">
          <div className="w-[21%] flex items-center justify-between gap-x-2">
            <span>Tags </span>
            <img src="/images/line64.svg" alt="line" />
            <div>n</div>
          </div>
          <div className="w-[21%] flex items-center justify-between gap-x-2">
            <span>Share</span>
            <img src="/images/line64.svg" alt="line" />
            <img src="/images/instagram.svg" alt="instagram" />
          </div>
        </div>
        <div className="border-t border-[#D8D8D8] pt-12">
          <h2 className="text-[26px] mb-4">Leave a reply</h2>
          <p className="mb-6 text-[#707070]">
            Your email address will not be published. Required fields are marked
            *
          </p>
          <form className="mb-16">
            <input
              type="text"
              name="name"
              className="w-full pt-12 pb-3 border-b border-[#D8D8D8]"
              placeholder="Enter your name*"
              onClick={handleBtnOnInput}
            />
            <input
              type="email"
              name="email"
              className="w-full pt-12 pb-3 border-b border-[#D8D8D8]"
              placeholder="Enter your email*"
            />
            <input
              type="text"
              name="website"
              className="w-full pt-12 pb-3 border-b border-[#D8D8D8] mb-7"
              placeholder="Enter your Website"
            />
            <div className="w-[65%] mb-18 flex items-center justify-between gap-x-1">
              <input type="checkbox" id="checkbox" />
              <label htmlFor="checkbox" className="text-xs text[#707070]">
                Save my name, email, and website in this browser for the next
                time I comment
              </label>
            </div>
            <textarea
              className="w-full mb-16 border-b border-[#D8D8D8]"
              row-5
              placeholder="Your Comment*"
            ></textarea>
            <button className="py-4 px-9 font-bold bg-black text-white hover:bg-white hover:text-black border rounded-sm">
              POST COMMENT
            </button>
          </form>
          {/* комментарии */}
          <h2 className="mb-11 text-[26px]">Comments n</h2>
          {/* комментарий и отзыв */}
          <div className="w-full">
            {/* комментарий */}
            <div className="w-full mb-12 flex items-start justify-between gap-x-6">
              <div>
                <img className="rounded-sm mb-6" src="/images/blog04.webp" />
              </div>
              <div className="w-[86%]">
                <div className="mb-4 flex items-center justify-between">
                  <div className="w-[41%] flex items-center justify-between">
                    <h3 className="text-xl">Scarlet withch</h3>
                    <span className="text-[#707070]">Date</span>
                  </div>
                  <div className="w-[8%] flex items-center justify-between gap-x-1">
                    <img src="/images/arrow-share.svg" alt="arrow-share" />
                    <span className="text-[13px] text-[#707070]">Reply</span>
                  </div>
                </div>
                <p className="text-[#707070]">
                  Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed
                  diam nonummy nibh euismod tincidunt ut laoreet.{" "}
                </p>
              </div>
            </div>
            {/* отзыв */}
            <div className="pl-26">
              <div className="w-full mb-12 flex items-start justify-between gap-x-6">
                <div>
                  <img className="rounded-sm" src="/images/blog06.jpg" />
                </div>
                <div className="w-[86%]">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="w-[41%] flex items-center justify-between">
                      <h3 className="text-xl">Scarlet withch</h3>
                      <span className="text-[#707070]">Date</span>
                    </div>
                    <div className="w-[8%] flex items-center justify-between gap-x-1">
                      <img src="/images/arrow-share.svg" alt="arrow-share" />
                      <span className="text-[13px] text-[#707070]">Reply</span>
                    </div>
                  </div>
                  <p className="text-[#707070]">
                    Lorem ipsum dolor sit amet, consectetuer adipiscing elit,
                    sed diam nonummy nibh euismod tincidunt ut laoreet.{" "}
                  </p>
                </div>
              </div>
            </div>
            {/* комментарий */}
            <div className="w-full mb-12 flex items-start justify-between gap-x-6">
              <div className="w-25 h-25 mb-6">
                <img className="rounded-sm" src="/images/blog07.webp" />
              </div>
              <div className="w-[86%]">
                <div className=" flex items-center justify-between">
                  <div className="w-[41%] flex items-center justify-between">
                    <h3 className="text-xl">Scarlet withch</h3>
                    <span className="text-[#707070]">Date</span>
                  </div>
                  <div className="w-[8%] flex items-center justify-between gap-x-1">
                    <img src="/images/arrow-share.svg" alt="arrow-share" />
                    <span className="text-[13px] text-[#707070]">Reply</span>
                  </div>
                </div>
                <p className="text-[#707070]">
                  Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed
                  diam nonummy nibh euismod tincidunt ut laoreet.{" "}
                </p>
              </div>
            </div>
             {/* отзыв */}
            <div className="pl-26">
              <div className="w-full mb-12 flex items-start justify-between gap-x-6">
                <div>
                  <img className="rounded-sm" src="/images/blog09.webp" />
                </div>
                <div className="w-[86%]">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="w-[41%] flex items-center justify-between">
                      <h3 className="text-xl">Scarlet withch</h3>
                      <span className="text-[#707070]">Date</span>
                    </div>
                    <div className="w-[8%] flex items-center justify-between gap-x-1">
                      <img src="/images/arrow-share.svg" alt="arrow-share" />
                      <span className="text-[13px] text-[#707070]">Reply</span>
                    </div>
                  </div>
                  <p className="text-[#707070]">
                    Lorem ipsum dolor sit amet, consectetuer adipiscing elit,
                    sed diam nonummy nibh euismod tincidunt ut laoreet.{" "}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
