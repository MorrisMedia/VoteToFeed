import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  return { title: `Pet ${params.id}` };
}

export default async function PetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <div>Pet page {params.id} - minimal test</div>;
}
