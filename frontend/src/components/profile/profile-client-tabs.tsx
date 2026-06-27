"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, MapPin, Heart, MessageSquare, Bookmark, Share2 } from "lucide-react";
import { VerifiedBadge } from "@/components/ui/verified-badge";

function getRelativeTime(date: Date) {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'short' });
  const difference = date.getTime() - new Date().getTime();
  const daysDifference = Math.round(difference / (1000 * 60 * 60 * 24));
  if (Math.abs(daysDifference) > 0) {
      if (Math.abs(daysDifference) >= 30) {
          return rtf.format(Math.round(daysDifference / 30), 'month');
      }
      return rtf.format(daysDifference, 'day');
  }
  const hoursDifference = Math.round(difference / (1000 * 60 * 60));
  if (Math.abs(hoursDifference) > 0) {
      return rtf.format(hoursDifference, 'hour');
  }
  const minutesDifference = Math.round(difference / (1000 * 60));
  if (Math.abs(minutesDifference) > 0) {
      return rtf.format(minutesDifference, 'minute');
  }
  return "just now";
}

type TabId = "reviews" | "following" | "favorites";



function RestaurantCard({ res }: { res: any }) {
    return (
        <Link
            href={`/restaurant/${res.slug}`}
            className="group bg-white dark:bg-[#1E1E1E] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4 hover:shadow-md transition-all active:scale-[0.98]"
        >
            <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-100 dark:border-gray-800">
                {res.coverImage ? (
                    <Image
                        src={res.coverImage}
                        alt={res.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                        <MapPin className="w-6 h-6" />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate group-hover:text-[#e8323b] transition-colors">{res.name}</h4>
                    {(res.isVerifiedPartner || res.isFeatured) && <VerifiedBadge size={14} />}
                </div>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">{res.category || "Restaurant"}</p>
                <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-[#abd039]/10 rounded text-[10px] font-black text-[#89a72e]">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span>{res.averageRating?.toFixed(1) || "New"}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">
                        {res.location?.area || "Pakistan"}
                    </span>
                </div>
            </div>
        </Link>
    );
}

export default function ProfileClientTabs({ profile }: { profile: any }) {
  const [activeTab, setActiveTab] = useState<TabId>("reviews");
  const [showShareToast, setShowShareToast] = useState(false);

  const tabs: { id: TabId; label: string; icon: typeof MessageSquare; count: number; color: string }[] = [
    { id: "reviews", label: "Reviews", icon: MessageSquare, count: profile.stats.reviewCount, color: "[#abd039]" },
    { id: "following", label: "Following", icon: Heart, count: profile.stats.followingCount, color: "[#e8323b]" },
    { id: "favorites", label: "Favorites", icon: Bookmark, count: profile.stats.savedCount || 0, color: "[#f59e0b]" },
  ];

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `${profile.name} on Foodies Pakistan`, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    }
  };

  return (
    <div className="w-full">


      {/* Share button + Profile completeness */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-2 flex items-center justify-between">
        {profile.stats.completenessScore !== undefined && profile.stats.completenessScore < 100 && (
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-1 max-w-[140px] h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#abd039] to-[#89a72e] transition-all duration-700"
                style={{ width: `${profile.stats.completenessScore}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-gray-400">{profile.stats.completenessScore}% complete</span>
          </div>
        )}
        <button onClick={handleShare} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-[#e8323b] transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
          <Share2 className="w-3.5 h-3.5" />
          Share
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] sticky top-16 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 pt-6 text-sm font-medium border-b-2 transition-colors duration-200 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? `border-${tab.color} text-${tab.color}`
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feed Content */}
      <div className="bg-[#fcfcfc] dark:bg-[#0f0f0f] py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {activeTab === "reviews" && (
            <div className="grid grid-cols-1 gap-6">
              {profile.recentReviews && profile.recentReviews.length > 0 ? (
                profile.recentReviews.map((review: any) => (
                  <div key={review._id} className="bg-white dark:bg-[#1E1E1E] p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                    {/* Restaurant Context */}
                    <Link href={`/restaurant/${review.restaurant?.slug}`} className="group flex items-center gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                         {review.restaurant?.coverImage ? (
                            <Image 
                               src={review.restaurant.coverImage} 
                               alt={review.restaurant.name} 
                               fill 
                               className="object-cover group-hover:scale-105 transition-transform duration-300" 
                            />
                         ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <MapPin className="w-5 h-5" />
                            </div>
                         )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-[#abd039] transition-colors">{review.restaurant?.name || "Unknown Restaurant"}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {review.restaurant?.location?.address || "Location unavailable"}
                        </p>
                      </div>
                    </Link>

                    {/* Meta & Rating */}
                    <div className="flex items-center justify-between mb-3">
                       <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < review.rating ? "fill-[#abd039] text-[#abd039]" : "fill-gray-100 text-gray-200 dark:fill-gray-800 dark:text-gray-800"}`} 
                            />
                          ))}
                       </div>
                       <span className="text-xs text-gray-400">
                           {getRelativeTime(new Date(review.createdAt))}
                       </span>
                    </div>

                    {/* Review Text */}
                    <p className="text-gray-700 dark:text-gray-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                      {review.text}
                    </p>

                    {/* Photos */}
                    {review.photos && review.photos.length > 0 && (
                       <div className="mt-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                          {review.photos.map((photo: string, idx: number) => (
                             <div key={idx} className="relative w-24 h-24 md:w-32 md:h-32 flex-shrink-0 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 cursor-pointer hover:opacity-90">
                                 <Image src={photo} alt="Review photo" fill className="object-cover" />
                             </div>
                          ))}
                       </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-16 px-4 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
                  <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No reviews yet</h3>
                  <p className="text-gray-500 mt-2 max-w-sm mx-auto">This foodie hasn&apos;t shared any reviews yet. Check back later!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "following" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.followedRestaurants && profile.followedRestaurants.length > 0 ? (
                profile.followedRestaurants.map((res: any) => <RestaurantCard key={res._id} res={res} />)
              ) : (
                <div className="col-span-full text-center py-16 px-4 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
                  <Heart className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Not following anyone</h3>
                  <p className="text-gray-500 mt-2 max-w-sm mx-auto">This foodie hasn&apos;t followed any restaurants yet. Start exploring!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "favorites" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.savedRestaurants && profile.savedRestaurants.length > 0 ? (
                profile.savedRestaurants.map((res: any) => <RestaurantCard key={res._id} res={res} />)
              ) : (
                <div className="col-span-full text-center py-16 px-4 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
                  <Bookmark className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No favorites yet</h3>
                  <p className="text-gray-500 mt-2 max-w-sm mx-auto">This foodie hasn&apos;t saved any restaurants yet.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Share Toast */}
      {showShareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-bold px-5 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-4">
          ✓ Profile link copied!
        </div>
      )}
    </div>
  );
}
