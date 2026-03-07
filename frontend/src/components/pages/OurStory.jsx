import React from "react";

export const OurStory = () => {
  return (
    <div className="w-164 m-auto pt-55 pb-62">
      <h1 className="mb-6 text-[33px] text-center font-medium">About</h1>
      <p className="text-xl text-center mb-12">
        Who we are and why we do what we do!
      </p>
      <p className="mb-10">
        Duis rutrum dictum libero quis rutrum. Etiam sed neque aliquam,
        sollicitudin ante a, gravida arcu. Nam fringilla molestie velit, eget
        pellentesque risus scelerisque a. Nam ac urna maximus, tempor magna et,
        placerat urna. Curabitur eu magna enim. Proin placerat tortor lacus, ac
        sodales lectus placerat quis.{" "}
      </p>
      <h2 className="mb-6 text-[26px]">Top trends</h2>
      <div className="w-full mb-12">
        <img className="w-1/2 h-auto rounded-md m-auto" src="/images/i7.webp" alt="beads" />
      </div>
      <p className="mb-10">
        Duis rutrum dictum libero quis rutrum. Etiam sed neque aliquam,
        sollicitudin ante a, gravida arcu. Nam fringilla molestie velit, eget
        pellentesque risus scelerisque a. Nam ac urna maximus, tempor magna et,
        placerat urna. Curabitur eu magna enim. Proin placerat tortor lacus, ac
        sodales lectus placerat quis.
      </p>
      <ul className="list-disc mb-12 pl-6 marker:text-gray-700">
        <li className="mb-4">consectetur adipiscing elit. Aliquam placerat</li>
        <li>Lorem ipsum dolor sit amet consectetur</li>
      </ul>
      <h2 className="mb-6 text-[26px]">Top trends</h2>
      <div className="w-1/3 h-auto mb-12 m-auto rounded-md">
        <img
          src="/images/i10.webp"
          alt="beads"
          className="w-full h-full object-cover rounded-md"
        />
      </div>
      <p className="mb-4">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam placerat, augue a volutpat hendrerit, sapien tortor faucibus augue, a maximus elit ex vitae libero. Sed quis mauris eget arcu facilisis consequat sed eu felis. Nunc sed porta augue. Morbi porta tempor odio, in molestie diam bibendu.
      </p>
    </div>
  );
};
