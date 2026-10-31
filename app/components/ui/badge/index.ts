import { cva, type VariantProps } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

// Crystal Neuo badge: material radius, label voice and state colours.
export const badgeVariants = cva(
  'cn-badge cn-badge--size-sm inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'cn-badge--primary',
        secondary: 'cn-badge--neutral',
        destructive: 'cn-badge--danger',
        success: 'cn-badge--success',
        warning: 'cn-badge--warning',
        outline: 'cn-badge--neutral bg-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>
