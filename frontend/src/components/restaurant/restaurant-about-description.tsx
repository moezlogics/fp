import DOMPurify from "isomorphic-dompurify";

type Props = {
  html: string;
  brandName?: string;
  name: string;
};

/**
 * Server-rendered owner description — passed as a child slot so the HTML is
 * NOT serialized again in the RSC flight payload (mobilestore.pk pattern).
 */
export default function RestaurantAboutDescription({ html, brandName, name }: Props) {
  if (!html?.trim()) return null;

  // Replace &nbsp; and unicode non-breaking spaces with normal spaces
  // to allow proper word boundary reading by search bots and natural text wrapping.
  const cleanHtml = html.replace(/&nbsp;/g, " ").replace(/\u00a0/g, " ");

  return (
    <div className="space-y-2 w-full min-w-0">
      <h3 className="text-sm font-black text-black">About {brandName || name}</h3>
      <div
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cleanHtml) }}
        className="prose prose-sm max-w-none text-[13px] md:text-sm text-zinc-950 leading-relaxed [&_p]:mb-3 [&_p]:last:mb-0 [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-4 [&_table]:max-w-full [&_table]:overflow-x-auto [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 description-text"
      />
    </div>
  );
}
