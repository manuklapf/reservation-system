import WidgetContent from './WidgetContent'

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  return <WidgetContent tenantSlug={tenantSlug} />
}
