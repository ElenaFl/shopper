import React from "react";
import { NavLink } from "react-router-dom";
import { Select } from "../components/ui/Select/Select.jsx";

export const Checkout = () => {
  return (
    <div className="mt-55 mb-62">
      <h1 className="text-4xl font-medium text-center">Checkout</h1>
      {/* <div className="mb-4">
        <span className="text-[#707070]">Returning customer?</span>
        <button>Click here</button>
        to login
      </div>
      <div className="mb-6">
        <span className="text-[#707070]">Have a coupon?</span>
        <button>Click here to enter your code</button>
      </div>
      <div className="w-xl border border-gray-400 p-6 mb-12">
        <p className="text-[#707070] mb-10">
          If you have a coupon code, please apply it below.
        </p>
        <div className="flex items-center justify-between gap-7">
          <div className="w-full h-full border-b border-[#D8D8D8] pt-3 pb-5">
            <input
              className="text-sm text-[#707070]"
              placeholder="Coupon Code"
            />
          </div>
          <div className="w-full">
            <button className="w-full py-4 font-bold bg-black text-white borderhover:bg-white hover:text-black rounded-sm">
              APPLY COUPON
            </button>
          </div>
        </div>
      </div> */}
      {/* общий блок */}
      <div className="w-full mt-24 flex justify-between text-[#707070] mb-3xs">
        {/* левый блок */}
        <div className="w-[46%]">
          <h2 className="text-2xl text-black">Billing Details</h2>
          <form className="mb-9">
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
              <input
                type="text"
                name="postCode"
                placeholder="Postcode / ZIP *"
              />
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
          <div className="mb-9">
            <input
              type="checkbox"
              name="account"
              id="account"
              className="mr-2"
            />
            <label className="text-black" htmlFor="account">
              Create an acoount?
            </label>
          </div>
          <p className="mb-9 pb-3 text-[#c6c2c2] border-b border-[#D8D8D8]">
            Order notes
          </p>
        </div>
        {/* правый блок */}
        <div className="w-[46%]">
          <h2 className="text-2xl text-black pb-7">YOUR ORDER</h2>
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
            <form>
              <input
                className="mr-2 mb-6"
                type="radio"
                name="radioPay"
                id="radioPay1"
              />
              <label htmlFor="radioPay">Direct bank transfer</label>
              <p className="text-[#707070] mb-6">
                Make your payment directly into our bank account. Please use
                your Order ID as the payment reference. Your order will not be
                shipped until the funds have cleared in our account
              </p>
              <div className="mr-2 mb-6">
                <input
                  className="mr-2"
                  type="radio"
                  name="radioPay"
                  id="radioPay2"
                />
                <label htmlFor="radioPay">Check payments</label>
              </div>
              <div className="mr-2 mb-6">
                <input
                  className="mr-2"
                  type="radio"
                  name="radioPay3"
                  id="radioPay"
                />
                <label htmlFor="radioPay">Cash on delivery</label>
              </div>
              <div className="w-[20%] flex items-center justify-between mb-11">
                <input
                  className="mr-2"
                  type="radio"
                  name="radioPay"
                  id="radioPay4"
                />
                <label htmlFor="radioPay">PayPal</label>
                <img src="/images/pay-pal.svg" alt="pay-pal" />
              </div>
              <NavLink
                to="/orderDetails"
                className="w-full px-44 py-6 font-bold bg-black text-white hover:bg-white hover:text-black border rounded-sm"
              >
                PLACE ORDER
              </NavLink>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
