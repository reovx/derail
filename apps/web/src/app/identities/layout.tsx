/**
 * The identities screen is a client component (it reads the connected wallet),
 * and a client component cannot export `metadata`. This server layout exists
 * only to give the route its tab title.
 */
export const metadata = { title: "Identities" };

export default function IdentitiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
