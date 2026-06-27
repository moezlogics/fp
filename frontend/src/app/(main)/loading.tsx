/**
 * Homepage Loading Skeleton — Server Component
 * Matches the actual homepage layout: Hero → Categories → Featured → Best of City → Bank Deals
 * Server-rendered for instant paint — no client JS needed
 */
export default function MainLoading() {
  return (
    <div className="max-w-7xl mx-auto px-2.5 md:px-4 pt-2 pb-24 md:pb-12 space-y-4 animate-in fade-in duration-150">
      {/* ── Hero Banner ── */}
      <section className="rounded-xl overflow-hidden shadow-md">
        <div className="w-full h-48 md:h-80 lg:h-96 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 skeleton-shimmer" />
      </section>

      {/* ── Category Icons ── */}
      <section>
        <div className="flex overflow-x-auto gap-2.5 md:gap-4 pb-1 hide-scrollbar md:flex-wrap md:justify-center">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 w-14 md:w-18">
              <div className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 rounded-lg skeleton-shimmer" />
              </div>
              <div className="w-10 h-2 bg-gray-100 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Section ── */}
      <section>
        <div className="flex justify-between items-end mb-3">
          <div>
            <div className="w-24 h-2 bg-primary/15 rounded skeleton-shimmer mb-1" />
            <div className="w-48 h-5 bg-gray-100 rounded skeleton-shimmer" />
          </div>
          <div className="w-12 h-3 bg-primary/15 rounded skeleton-shimmer" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="min-w-[calc(50vw-24px)] sm:min-w-[200px] md:min-w-[240px] shrink-0 rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm flex flex-col"
            >
              <div className="w-full h-28 md:h-32 bg-gray-100 skeleton-shimmer shrink-0" />
              <div className="relative px-3 pb-3 pt-5 flex flex-col flex-1 space-y-2">
                <div className="absolute -top-5 left-3 w-10 h-10 rounded-full border-2 border-white bg-gray-100 skeleton-shimmer z-10" />
                <div className="w-3/4 h-3.5 bg-gray-100 rounded skeleton-shimmer" />
                <div className="w-1/2 h-2.5 bg-gray-50 rounded skeleton-shimmer" />
                <div className="flex justify-between items-center mt-auto pt-1 border-t border-gray-50">
                  <div className="w-16 h-2 bg-gray-50 rounded skeleton-shimmer" />
                  <div className="w-12 h-6 bg-gray-100 rounded skeleton-shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Best of City ── */}
      <section>
        <div className="flex justify-between items-end mb-3">
          <div>
            <div className="w-16 h-2 bg-primary/15 rounded skeleton-shimmer mb-1" />
            <div className="w-36 h-5 bg-gray-100 rounded skeleton-shimmer" />
          </div>
          <div className="w-12 h-3 bg-primary/15 rounded skeleton-shimmer" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="w-full rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm flex flex-col"
            >
              <div className="w-full h-28 md:h-32 bg-gray-100 skeleton-shimmer shrink-0" />
              <div className="relative px-3 pb-3 pt-5 flex flex-col flex-1 space-y-2">
                <div className="absolute -top-5 left-3 w-10 h-10 rounded-full border-2 border-white bg-gray-100 skeleton-shimmer z-10" />
                <div className="w-3/4 h-3.5 bg-gray-100 rounded skeleton-shimmer" />
                <div className="w-1/2 h-2.5 bg-gray-50 rounded skeleton-shimmer" />
                <div className="flex justify-between items-center mt-auto pt-1 border-t border-gray-50">
                  <div className="w-16 h-2 bg-gray-50 rounded skeleton-shimmer" />
                  <div className="w-12 h-6 bg-gray-100 rounded skeleton-shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bank Deals ── */}
      <section className="bg-gray-950 rounded-xl p-5 md:p-8 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-primary/10 rounded-full blur-[80px]" />
        <div className="flex justify-between items-end relative z-10">
          <div>
            <div className="w-16 h-2 bg-primary/30 rounded skeleton-shimmer mb-1" />
            <div className="w-28 h-5 bg-white/10 rounded skeleton-shimmer" />
          </div>
          <div className="w-16 h-3 bg-primary/30 rounded skeleton-shimmer" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="min-w-[200px] md:min-w-[240px] h-[130px] rounded-xl bg-white/5 border border-white/10 p-5 space-y-3"
            >
              <div className="w-12 h-12 bg-white/10 rounded skeleton-shimmer" />
              <div className="w-20 h-5 bg-white/10 rounded skeleton-shimmer" />
              <div className="w-16 h-2 bg-white/5 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
