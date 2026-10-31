import { cva, type VariantProps } from 'class-variance-authority'

export { default as Button } from './Button.vue'

// Buttons render Crystal Neuo's `cn-button`, so each material's press travel,
// ink borders, offset shadows and the platform's primary shape apply. Tailwind
// classes passed by callers still win (component CSS is layered below them).
export const buttonVariants = cva(
  'cn-button whitespace-nowrap shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-4 [&_svg]:shrink-0 hover:before:opacity-[0.07] aria-invalid:border-destructive',
  {
    variants: {
      variant: {
        default: 'cn-button--primary',
        destructive: 'cn-button--danger',
        outline: 'cn-button--secondary',
        secondary: 'cn-button--secondary',
        ghost: 'cn-button--ghost border-transparent shadow-none',
        link: 'cn-button--ghost border-transparent shadow-none min-h-0 px-0 text-brand-subtle underline underline-offset-4 hover:before:opacity-0',
      },
      size: {
        default: 'cn-button--size-md',
        sm: 'cn-button--size-sm',
        lg: 'cn-button--size-lg',
        icon: 'cn-button--size-md aspect-square px-0 min-w-control',
        'icon-sm': 'cn-button--size-sm aspect-square px-0 min-w-control-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
