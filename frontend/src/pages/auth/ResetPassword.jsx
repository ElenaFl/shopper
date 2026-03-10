import React from "react";
import { Button } from "../../components/ui/Button/Button.jsx";

export const ResetPassword = () => {
  return (
    <div className="w-140 my-63 m-auto">
      <h1 className="text-[33px] mb-10">Have you Forgotten Your Password ?</h1>
      <div className="w-125 m-auto">
        <p className="text-xl text-center mb-19">
          If you've forgotten your password, enter your e-mail address and we'll
          send you an e-mail{" "}
        </p>
        <input
          type="email"
          className="w-full pb-3 mb-16 text-[#707070] border-b border-[#D8D8D8]"
          placeholder="Email"
        />
        <Button name="RESET PASSWORD" color="black" />
      </div>
    </div>
  );
};
