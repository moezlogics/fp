"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

export interface FaqItem {
    question: string;
    answer: string;
}

interface FaqSectionProps {
    faqs: FaqItem[];
    title?: string;
    eyebrow?: string;
    description?: string;
    className?: string;
    defaultOpenIndex?: number;
    itemClassName?: string;
    titleClassName?: string;
}

export function FaqSection({
    faqs,
    title = "Frequently Asked Questions",
    eyebrow = "Quick Answers",
    description = "Helpful answers to common questions diners usually check before booking, visiting, or paying.",
    className = "",
    defaultOpenIndex = 0,
    itemClassName = "",
    titleClassName = "",
}: FaqSectionProps) {
    const [openIndex, setOpenIndex] = useState<number>(faqs.length > 0 ? defaultOpenIndex : -1);

    if (!faqs || faqs.length === 0) return null;

    return (
        <section className={`mt-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
            <div className="mb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
                    {eyebrow}
                </p>
                <h2 className={`mt-1 text-base font-black tracking-tight text-gray-900 ${titleClassName}`}>
                    {title}
                </h2>
                {description ? (
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                        {description}
                    </p>
                ) : null}
            </div>

            <div className="space-y-2">
                {faqs.map((faq, index) => {
                    const isOpen = index === openIndex;

                    return (
                        <div
                            key={`${faq.question}-${index}`}
                            className={`overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/70 ${itemClassName}`}
                        >
                            <button
                                type="button"
                                onClick={() => setOpenIndex(isOpen ? -1 : index)}
                                aria-expanded={isOpen}
                                aria-controls={`faq-panel-${index}`}
                                className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-white sm:px-5"
                            >
                                <span className="text-sm font-bold leading-6 text-gray-900">
                                    {faq.question}
                                </span>
                                <ChevronRight
                                    className={`mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                                />
                            </button>

                            {isOpen && (
                                <div
                                    id={`faq-panel-${index}`}
                                    className="border-t border-gray-100 bg-white px-4 py-3.5 text-sm leading-6 text-gray-600 sm:px-5"
                                >
                                    {faq.answer}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

export default FaqSection;
