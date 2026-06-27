"use client";

import { useState } from "react";
import { Clock } from "lucide-react";

const mockTimeSlots = [
    { time: "12:00", discount: 10, seats: 4 },
    { time: "13:00", discount: 10, seats: 2 },
    { time: "14:00", discount: 20, seats: 6 },
    { time: "15:00", discount: 50, seats: 8 }, // Off-peak massive discount
    { time: "16:00", discount: 40, seats: 4 },
    { time: "17:00", discount: 20, seats: 2 },
    { time: "18:00", discount: 10, seats: 4 },
    { time: "19:00", discount: 0, seats: 5 },  // Peak time
    { time: "20:00", discount: 0, seats: 3 },
    { time: "21:00", discount: 15, seats: 6 },
];

export function TimeDeals() {
    const [selectedTime, setSelectedTime] = useState<string | null>("15:00");

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-4">
            <div className="p-4 border-b border-gray-100 bg-red-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-500" /> Time-Based Deals
                </h3>
                <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded font-bold uppercase">Flash</span>
            </div>

            <div className="p-4">
                <p className="text-xs text-gray-500 mb-3">Book during off-peak hours for massive discounts on your entire food bill!</p>

                {/* Horizontal Scroll for Time Slots */}
                <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar snap-x">
                    {mockTimeSlots.map((slot) => {
                        const isSelected = selectedTime === slot.time;
                        return (
                            <button
                                key={slot.time}
                                onClick={() => setSelectedTime(slot.time)}
                                className={`snap-center flex-shrink-0 flex flex-col items-center justify-center border rounded-lg p-2 w-16 transition-all ${isSelected
                                        ? "border-red-500 bg-red-50 ring-1 ring-red-500"
                                        : "border-gray-200 hover:border-red-300"
                                    }`}
                            >
                                <span className={`text-[10px] font-bold ${slot.discount > 0 ? "text-red-600" : "text-gray-400"}`}>
                                    {slot.discount > 0 ? `-${slot.discount}%` : "0%"}
                                </span>
                                <span className={`text-sm font-bold ${isSelected ? "text-red-700" : "text-gray-800"}`}>
                                    {slot.time}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {selectedTime && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <p className="text-xs text-gray-500">Selected Time</p>
                                <p className="font-bold text-gray-800">{selectedTime} Today</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500">Discount</p>
                                <p className="font-bold text-red-600">
                                    {mockTimeSlots.find((s) => s.time === selectedTime)?.discount}% OFF
                                </p>
                            </div>
                        </div>
                        <button className="w-full bg-red-500 hover:bg-red-600 text-white font-bold text-sm py-2.5 rounded-lg transition">
                            Reserve Table For Free
                        </button>
                        <p className="text-center text-[10px] text-gray-400 mt-2">No advance payment required</p>
                    </div>
                )}
            </div>
        </div>
    );
}
