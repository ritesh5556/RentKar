import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export default function Container({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4', className)} {...rest} />
}
