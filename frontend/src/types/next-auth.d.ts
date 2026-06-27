import "next-auth";

declare module "next-auth" {
    interface Session {
        accessToken?: string | null;
        user: {
            id?: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            avatar?: string;
            phone?: string;
            role?: string;
            isApproved?: boolean;
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string | null;
        refreshToken?: string | null;
        role?: string;
        isApproved?: boolean;
        phone?: string;
        avatar?: string;
    }
}
