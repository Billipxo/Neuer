import { useAuth } from '../app/auth'
import { PageHeader } from '../components/layout/PageHeader'
import { AboutContent } from '../components/about/AboutContent'

export function AboutPage() {
  const { store } = useAuth()
  return (
    <>
      <PageHeader title="Über Teller" subtitle="Datenschutz in Klartext, Hinweise und Impressum" back="/profil" />
      <AboutContent demo={store?.kind === 'local'} />
    </>
  )
}
