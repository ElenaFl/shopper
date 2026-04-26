import React from "react";
import { Select } from "../components/ui/Select/Select.jsx";

/**
 *
 * Contact Us - странца с формой обратной связи: поля имени/фамилии, email, селект (например, тема) и сообщение.
 *
 *  Отправка осуществляется кнопкой SEND
 */

export const Contact = () => {
  return (
    <div className="my-62">
      <h1 className="mt-50 mb-10 text-[33px] text-center font-medium">
        Contact Us
      </h1>
      <p className="mb-27 text-xl text-center">
        Say Hello send us your thoughts about our products or share
        <br />
        your ideas with our Team!
      </p>
      <form action="" className="w-227 m-auto">
        <div className="flex justify-between">
          {/* левый блок */}
          <div className="w-[43%] mb-32">
            <input
              type="text"
              name="firstName"
              className="w-full pb-3 mb-24 border-b border-[#D8D8D8]"
              placeholder="First name"
            />
            <input
              type="email"
              name="email"
              className="w-full pb-3 border-b border-[#D8D8D8]"
              placeholder="Email"
            />
          </div>
          {/* правый блок */}
          <div className="w-[43%] mb-32">
            <input
              type="text"
              name="lastName"
              className="w-full pb-3 mb-24 border-b border-[#D8D8D8]"
              placeholder="Last name"
            />
            <Select
              wrapperClassName="border-b border-[#D8D8D8]"
              className="w-full pb-3 appearance-none"
              arrowClassName="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-0 pointer-events-none"
            />
          </div>
        </div>
        <div>
          <textarea
            rows="3"
            placeholder="Message"
            className="w-full mb-24 pb-4 border-b border-[#D8D8D8]"
          />
          <div className="w-125 m-auto">
            <button className="w-full font-bold py-4 px-57 bg-black text-white hover:bg-white hover:text-black border rounded-sm cursor-pointer">
              SEND
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Contact;
