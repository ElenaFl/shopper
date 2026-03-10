import React from "react";
import { NavLink } from "react-router-dom";
import { Select } from "../../components/ui/Select/Select.jsx";
import { Button } from "../../components/ui/Button/Button.jsx";

export const AccountAddresses = () => {
  return (
    <div className="w-full flex justify-between text-[#707070] mb-62">
      {/* левый блок */}
      <div className="w-[46%]">
        <h2 className="text-2xl text-black">Billing Details</h2>
        <form className="mb-16">
          <div className="w-full flex justify-between items-center border-b border-[#D8D8D8]">
            <div className="w-[46%] pt-7 pb-3">
              <input type="text" name="first" placeholder="First name *" />
            </div>
            <div className="w-[46%] pt-7 pb-3">
              <input type="text" name="last" placeholder="Last name *" />
            </div>
          </div>
          <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
            <input type="text" name="company" placeholder="Company Name" />
          </div>
          <Select
            className="w-full pt-7 pb-3 border-b border-[#D8D8D8] text-[#c6c2c2]  appearance-none"
            arrowClassName="w-[16px] h-[16px] absolute top-[32px] right-3 pointer-events-none"
          />
          <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
            <input type="text" name="street" placeholder="Street Address *" />
          </div>
          <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
            <input type="text" name="postCode" placeholder="Postcode / ZIP *" />
          </div>
          <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
            <input type="text" name="city" placeholder="Town / City *" />
          </div>
          <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
            <input type="text" name="phone" placeholder="Phone *" />
          </div>
          <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
            <input type="email" name="email" placeholder="Email *" />
          </div>
        </form>
        <div className="w-1/2">
          <Button color="black" name="SAVE ADDRESS" />
        </div>
      </div>
      {/* правый блок */}
      <div className="w-[46%]">
        <h2 className="text-2xl text-black pb-7">Shipping Address</h2>
        <p className="mb-4 font-bold text-[#A18A68]">ADD</p>
        <p className="text-[Y#707070]">
          You have not set up this type of address yet.
        </p>
      </div>
    </div>
  );
};
