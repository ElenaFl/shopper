import React from "react";

export const AccountOrders = () => {
  return (
    <div className="mt-10 mb-50">
      <table className="w-full">
        <thead>
          <tr className="pb-4 border-b">
            <th className="pb-4 pr-35 text-left">ORDER NUMBER</th>
            <th className="pb-4 pr-35 text-left">DATE</th>
            <th className="pb-4 pr-35 text-left">STATUS</th>
            <th className="pb-4 pr-35 text-left">TOTAL</th>
            <th className="pb-4 pr-35 text-left">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
            <tr className="border-b border-[#D8D8D8] text-[#707070]">
                <td className="py-6 text-left">text</td>
                <td className="py-6 text-left">text</td>
                <td className="py-6 text-left">text</td>
                <td className="py-6 text-left">text</td>
                <td className="py-6 text-left">text</td>
            </tr>
        </tbody>
      </table>
    </div>
  );
};
