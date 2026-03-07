import React from "react";
import { NavLink } from "react-router-dom";

export const OrderDetails = () => {
  return (
    <div>
      {/* общий блок */}
      <div className="mt-96 mb-62 w-full flex justify-between">
        {/* левый блок */}
        <div className="w-145">
          <h2 className="text-[26px] mb-7">Order Details</h2>
          <div className="flex justify-between">
            {/* левый блок */}
            <div className="w-[45%]">
              <h3 className="mb-2">ORDER NUMBER</h3>
              <p className="text-[#707070] mb-10">1879605573994</p>
              <h3 className="mb-2">EMAIL</h3>
              <p className="text-[#707070] mb-10">Vitathemes@gmail.com</p>
              <h3 className="mb-2">PAYMENT METHOD</h3>
              <p className="text-[#707070] mb-10">
                Mastercard*************7865
              </p>
              <h3 className="mb-2">ORDER DATE</h3>
              <p className="text-[#707070] mb-10">October 8,2020</p>
            </div>
            {/* правый блок */}
            <div className="w-[28%]">
              <h3 className="mb-2">DELIVERY OPTIONS</h3>
              <p className="text-[#707070] mb-10">Standard delivery</p>
              <h3 className="mb-2">DELIVERY ADDRESS</h3>
              <p className="text-[#707070] mb-10">
                Kristian holst 34 old street W1F 7NU london United Kingdom
              </p>
              <h3 className="mb-2">CONTACT NUMBER</h3>
              <p className="text-[#707070] mb-10">+44 8749790988</p>
            </div>
          </div>
        </div>
        {/* правый блок */}
        <div className="w-145">
          <h2 className="text-[26px] mb-7">ORDER Summary</h2>
          <div className="w-full px-9 py-15 bg-[#EFEFEF]">
            <table className="w-full mb-15">
              <thead>
                <tr className="border-b border-[#D8D8D8]">
                  <th className="pb-5 text-start">PRODUCT</th>
                  <th className="pb-5 text-end">TOTAL</th>
                </tr>
              </thead>
              <tbody className="text-[#707070]">
                <tr>
                  <td className="pt-4 pb-3 text-start">Lira Earrings </td>
                  <td className="pt-4 pb-3 text-end">$64</td>
                </tr>
                <tr>
                  <td className="pt-4 pb-3 text-start">Lira Earrings</td>
                  <td className="pt-4 pb-3 text-end">$64</td>
                </tr>
                <tr className="border-b border-[#D8D8D8]">
                  <td className="pt-4 pb-3 text-start">Lira Earrings</td>
                  <td className="pt-4 pb-3 text-end">$64</td>
                </tr>
                <tr className="border-b border-[#D8D8D8]">
                  <td className="text-black pt-4 pb-3 text-start">SUBTOTAL</td>
                  <td className="pt-4 pb-3 text-end">$64</td>
                </tr>
                <tr className="border-b border-[#D8D8D8]">
                  <td className="text-black pt-4 pb-3 text-start">SHIPPING</td>
                  <td className="pt-4 pb-3 text-end">Free shipping</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="text-black font-bold border-b border-[#D8D8D8]">
                  <td className="pt-4 pb-3 text-start">TOTAL</td>
                  <td className="pt-4 pb-3 text-end">$85</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
