"use client";

import { CreditCard, Tag } from "lucide-react";

export function Vouchers() {
    const currentVouchers = [
        { id: 1, title: "Rs. 2500 Cash Voucher", price: 2000, value: 2500, label: "Save Rs. 500" },
        { id: 2, title: "Rs. 5000 Cash Voucher", price: 3800, value: 5000, label: "Save Rs. 1200" },
    ];

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-4">
            <div className="p-4 border-b border-gray-100 bg-green-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <Tag className="w-4 h-4 text-green-600" /> Pre-Purchase Vouchers
                </h3>
                <span className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded font-bold uppercase">Prepaid</span>
            </div>

            <div className="p-4 space-y-3">
                <p className="text-xs text-gray-500">Buy a cash voucher now and instantly redeem it for higher value at the restaurant!</p>

                {currentVouchers.map((v) => (
                    <div key={v.id} className="border border-green-200 bg-green-50/50 rounded-lg p-3 hover:border-green-400 transition cursor-pointer group">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="text-xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded shadow-sm">{v.label}</span>
                                <h4 className="font-bold text-gray-800 text-sm mt-1">{v.title}</h4>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-500 line-through">Rs. {v.value}</p>
                                <p className="text-base font-bold text-green-700">Rs. {v.price}</p>
                            </div>
                        </div>

                        <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2 rounded flex items-center justify-center gap-2 transition">
                            <CreditCard className="w-3 h-3" /> Buy Now
                        </button>
                    </div>
                ))}
            </div>
            <div className="bg-gray-50 p-3 text-center border-t border-gray-100">
                <p className="text-[10px] text-gray-400">Valid for 30 days from purchase. See T&Cs.</p>
            </div>
        </div>
    );
}
