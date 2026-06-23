import { Suspense } from 'react'
import CancelClient from './client'

export default function CancelPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense>
      <CancelClient slug={params.slug} />
    </Suspense>
  )
}
