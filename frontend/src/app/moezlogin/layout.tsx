import { AppSidebar } from "@/components/admin/app-sidebar"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { auth } from "@/auth"
import { AdminLoginForm } from "@/components/admin/admin-login"

export const dynamic = "force-dynamic";

export const metadata = {
    robots: {
        index: false,
        follow: false,
    },
};

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // â”€â”€ Auth Guard: Only admin role can access any /moezlogin/* route â”€â”€
    const session = await auth();
    const role = (session?.user as any)?.role;
    const accessToken = (session as any)?.accessToken || (session as any)?.user?.accessToken;
    const refreshToken = (session as any)?.refreshToken || (session as any)?.user?.refreshToken;
    const isDeadSession = (session as any)?.error === "RefreshTokenExpired" || (session as any)?.error === "SessionCallbackError";

    if (!session || role !== "admin" || isDeadSession || !accessToken || !refreshToken) {
        return <AdminLoginForm />;
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-[#F7F9FC]">
                <AppSidebar />
                <SidebarInset className="flex w-full flex-col bg-transparent">
                    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-gray-100 bg-white/80 backdrop-blur-xl px-6 lg:bg-transparent lg:border-none lg:backdrop-blur-none lg:py-4">
                        <SidebarTrigger className="-ml-2 bg-white shadow-sm border border-gray-100 rounded-lg w-8 h-8 flex items-center justify-center lg:hidden" />
                        <div className="flex-1 flex justify-between items-center">
                            <div className="font-bold text-gray-900 lg:hidden">Menu</div>
                            <div className="hidden lg:flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 ml-auto">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">A</div>
                                <span className="text-xs font-bold text-gray-700">{session.user?.name || "Super Admin"}</span>
                            </div>
                        </div>
                    </header>
                    <main className="flex-1 p-4 md:p-6 lg:p-0 lg:pr-6 lg:pb-6">
                        <div className="bg-white lg:rounded-[32px] rounded-2xl shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-gray-100 p-4 lg:p-8 min-h-[calc(100vh-100px)]">
                            {children}
                        </div>
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    )
}


