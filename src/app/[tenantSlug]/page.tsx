import TenantReservationsContent from './TenantReservationsContent'

export default async function TenantReservationsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params
  return <TenantReservationsContent tenantSlug={tenantSlug} />
}