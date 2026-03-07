import React from "react";
import { Button } from "../../ui/Button/Button.jsx";

/**
 * AccountDetails — страница редактирования данных аккаунта
 */
export const AccountDetails = () => {
  return (
    <div>
      <form className="max-w-lg">
        <label className="block mb-4">
          <span className="text-sm text-gray-700">Full name</span>
          <input
            type="text"
            name="name"
            className="w-full border-b py-2 mt-2 focus:outline-none"
            placeholder="Your name"
            autoComplete="name"
            required
          />
        </label>

        <label className="block mb-4">
          <span className="text-sm text-gray-700">Email</span>
          <input
            type="email"
            name="email"
            className="w-full border-b py-2 mt-2 focus:outline-none"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="block mb-4">
          <span className="text-sm text-gray-700">
            Password (leave blank to keep)
          </span>
          <input
            type="password"
            name="password"
            className="w-full border-b py-2 mt-2 focus:outline-none"
            placeholder="New password"
            autoComplete="new-password"
          />
        </label>
        <div className="w-1/2 mt-10 mb-62">
          <Button type="submit" color="black" name="SAVE ADDRESS" />
        </div>
      </form>
    </div>
  );
};
