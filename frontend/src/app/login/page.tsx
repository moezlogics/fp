import { redirect } from "next/navigation";

/**
 * /login is deprecated. All user login happens at /account.
 * This page exists only as a redirect for legacy bookmarks/links.
 */
export default function LoginRedirect() {
    redirect("/account");
}
