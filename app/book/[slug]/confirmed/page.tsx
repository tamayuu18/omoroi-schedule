import { Suspense } from 'react'
import ConfirmedClient from './client'

export default function ConfirmedPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense>
      <ConfirmedClient slug={params.slug} />
    </Suspense>
  )
}
