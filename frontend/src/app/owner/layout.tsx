import OwnerShell from "./owner-shell";
import { auth } from "@/auth";
import { OwnerLoginForm } from "@/components/owner/owner-login";

export const dynamic = "force-dynamic";

export const metadata = {
    robots: {
        index: false,
        follow: false,
    },
};

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    const role = (session?.user as any)?.role;
    const accessToken = (session as any)?.accessToken || (session as any)?.user?.accessToken;

    // Guard: Show login form if no session, wrong role, or tokens are missing
    if (!session || !["admin", "owner"].includes(role) || !accessToken) {
        return <OwnerLoginForm />;
    }
    return <OwnerShell>{children}</OwnerShell>;
}
