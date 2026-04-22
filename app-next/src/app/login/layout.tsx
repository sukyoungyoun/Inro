/** Avoid static prerender of /login: next-auth/react can throw when NEXTAUTH_URL is unset during CI/build. */
export const dynamic = "force-dynamic";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
