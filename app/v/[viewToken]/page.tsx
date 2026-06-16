import { Metadata } from "next";
import { notFound } from "next/navigation";
import TripPageClient from "../../t/[secret]/TripPageClient";
import { getDb, getTripByViewToken } from "../../../lib/db";

type Props = {
  params: Promise<{ viewToken: string }>;
};

export async function generateMetadata(_props: Props): Promise<Metadata> {
  return {
    title: "TripSync — view trip (read-only)",
    description: "View this shared trip calendar. Read-only link.",
  };
}

const VIEW_TOKEN_RE = /^[A-Za-z0-9\-_]{22,32}$/;

export default async function ViewPage({ params }: Props) {
  const { viewToken } = await params;

  // Validate token format and existence server-side so an invalid/unknown
  // token returns HTTP 404 (not a client-side 200 error state).
  if (!VIEW_TOKEN_RE.test(viewToken)) {
    notFound();
  }

  await getDb(); // ensure DB is initialized (creates table if missing)
  const row = await getTripByViewToken(viewToken);
  if (!row) {
    notFound();
  }

  // Pass readOnly=true and the viewToken as the "secret" prop.
  // TripPageClient uses readOnly to gate all edit controls.
  // It fetches via /api/trip-view/[viewToken] when readOnly=true.
  return <TripPageClient secret={viewToken} readOnly={true} />;
}
