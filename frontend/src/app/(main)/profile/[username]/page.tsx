import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { MapPin, Calendar, Star, CircleAlert, Globe, Instagram, Link as LinkIcon, Sparkles } from "lucide-react";
import ProfileClientTabs from "@/components/profile/profile-client-tabs";

interface ProfileContext {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfileContext): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `@${resolvedParams.username} - Foodies Pakistan`,
    description: `Explore the culinary journey of @${resolvedParams.username} on Foodies Pakistan. Real reviews, favorite spots, and more.`,
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
        title: `${resolvedParams.username}'s Foodie Profile | Foodies Pakistan`,
        description: `Join @${resolvedParams.username} in exploring the best tastes of Pakistan.`,
        images: ["https://foodiespakistan.s3.ap-south-1.amazonaws.com/assets/og-profile.png"]
    }
  };
}

async function getProfile(username: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/profiles/${username}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 404 || res.status === 403) return null;
      throw new Error(`Failed to fetch profile: ${res.statusText}`);
    }
    return res.json();
  } catch (err) {
    console.error("Error fetching profile:", err);
    return null;
  }
}

export default async function ProfilePage({ params }: ProfileContext) {
  const resolvedParams = await params;
  const profile = await getProfile(resolvedParams.username);

  if (!profile) {
    return notFound();
  }

  const avatarUrl = profile.avatar || "https://foodiespakistan.s3.ap-south-1.amazonaws.com/assets/default-avatar.png";

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A]">
      {/* ═══ PREMIUM DYNAMIC HEADER ═══ */}
      <div className="relative pt-12 md:pt-20 pb-10 overflow-hidden">
        {/* Background Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-gradient-to-b from-[#e8323b]/5 to-transparent blur-3xl opacity-50" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#abd039]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-48 -left-24 w-48 h-48 bg-blue-400/5 rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-10">
            {/* Avatar with Premium Border */}
            <div className="relative group">
              <div className="w-32 h-32 md:w-44 md:h-44 rounded-[40px] overflow-hidden border-[6px] border-white dark:border-[#1A1A1A] shadow-2xl transition-transform duration-500 group-hover:scale-[1.02] bg-white">
                <Image
                  src={avatarUrl}
                  alt={profile.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="absolute -bottom-4 -right-4 bg-white dark:bg-[#1A1A1A] p-2 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
                <div className="bg-[#e8323b] text-white p-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-primary/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Level {profile.stats.foodieLevel}</span>
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="flex-1 text-center md:text-left pb-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight drop-shadow-sm">
                  {profile.name}
                </h1>
                {profile.badges?.includes("Verified") && (
                    <div className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                        Verified Member
                    </div>
                )}
              </div>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2">
                <span className="text-lg font-bold text-[#e8323b]">@{profile.username}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 hidden md:block" />
                <span className="text-sm font-bold text-gray-400 flex items-center gap-1.5 uppercase tracking-widest">
                    <Calendar className="w-3.5 h-3.5" /> Joined {new Date(profile.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>

              {profile.bio && (
                <div className="mt-5 relative">
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed italic">
                    "{profile.bio}"
                  </p>
                </div>
              )}

              {/* Social Links Badge Row */}
              {profile.socialLinks && Object.values(profile.socialLinks).some(v => v) && (
                <div className="flex items-center justify-center md:justify-start gap-2.5 mt-5">
                    {profile.socialLinks.instagram && (
                        <a href={`https://instagram.com/${profile.socialLinks.instagram}`} target="_blank" className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shadow-lg shadow-[#dc2743]/20 transition-all hover:-translate-y-1 active:scale-95">
                            <Instagram className="w-5 h-5" />
                        </a>
                    )}
                    {profile.socialLinks.website && (
                        <a href={profile.socialLinks.website} target="_blank" className="w-10 h-10 rounded-xl bg-white dark:bg-[#1A1A1A] flex items-center justify-center text-[#e8323b] shadow-xl border border-gray-100 dark:border-gray-800 transition-all hover:-translate-y-1 active:scale-95">
                            <Globe className="w-5 h-5" />
                        </a>
                    )}
                </div>
              )}
            </div>
          </div>

          {/* Premium Unified Stats Bar */}
          <div className="mt-12 bg-white/50 dark:bg-[#1A1A1A]/50 backdrop-blur-xl rounded-[32px] p-2 border border-white/60 dark:border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                    { label: "Reviews", value: profile.stats.reviewCount, icon: Star, color: "#e8323b", bg: "bg-[#e8323b]/5" },
                    { label: "Photos", value: profile.stats.photoCount, icon: MapPin, color: "#6366F1", bg: "bg-indigo-500/5" },
                    { label: "Bookings", value: profile.stats.bookingCount || 0, icon: Calendar, color: "#B45309", bg: "bg-amber-500/5" },
                    { label: "Check-ins", value: profile.stats.checkinCount || 0, icon: Globe, color: "#2D6A4F", bg: "bg-emerald-500/5" },
                ].map((s, i) => (
                    <div key={i} className="flex flex-col items-center justify-center py-6 px-4 rounded-[24px] transition-all hover:bg-white dark:hover:bg-black/20 group">
                        <span className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white group-hover:scale-110 transition-transform">
                            {s.value.toLocaleString()}
                        </span>
                        <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mt-1 transition-colors group-hover:text-primary">
                            {s.label}
                        </span>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content Feed Section */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        <ProfileClientTabs profile={profile} />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
          @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
          }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      ` }} />
    </div>
  );
}
