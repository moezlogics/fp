import DOMPurify from "isomorphic-dompurify";
import type { RestaurantFaqItem } from "@/lib/restaurant-faqs";

export default function RestaurantFaqsServer({
  faqs,
  restaurantName,
}: {
  faqs: RestaurantFaqItem[];
  restaurantName: string;
}) {
  if (!faqs?.length) return null;

  return (
    <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-3 sm:p-5 shadow-sm">
      <div className="mb-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">Quick Answers</p>
        <h2 className="mt-1 text-base font-black tracking-tight text-gray-900">
          FAQs about {restaurantName}
        </h2>
      </div>
      <div className="space-y-2">
        {faqs.map((faq) => (
          <details
            key={faq.question}
            className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/70 group"
          >
            <summary className="cursor-pointer px-3 py-3 text-sm font-bold leading-6 text-gray-900 sm:px-5">
              {faq.question}
            </summary>
            <div
              className="border-t border-gray-100 bg-white px-3 py-3 text-sm leading-6 text-gray-600 sm:px-5"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(faq.answer),
              }}
            />
          </details>
        ))}
      </div>
    </div>
  );
}
