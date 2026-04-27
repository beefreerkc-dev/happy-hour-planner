import MeetingPageClient from "./MeetingPageClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function MeetingPage({ params }: Props) {
  const { id } = await params;
  return <MeetingPageClient id={id} />;
}
