import RequestContent from './RequestContent'

export default async function RequestPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  return <RequestContent tenantSlug={tenantSlug} />
}
