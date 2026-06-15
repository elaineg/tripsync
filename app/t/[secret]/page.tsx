import { Metadata } from "next";
import TripPageClient from "./TripPageClient";

type Props = {
  params: Promise<{ secret: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { secret } = await params;
  return {
    title: `TripSync — shared trip`,
    description: `View and edit this shared trip calendar. Secret: ${secret.slice(0, 4)}...`,
  };
}

export default async function TripPage({ params }: Props) {
  const { secret } = await params;
  return <TripPageClient secret={secret} />;
}
