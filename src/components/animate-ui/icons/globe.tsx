'use client'

import * as React from 'react'
import { motion, type Variants } from 'motion/react'

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon'

type GlobeProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    c0: {} satisfies Variants,
    c1: {
      initial: { scaleX: 1 },
      animate: {
        scaleX: [1, 0.2, 1],
        transition: { duration: 0.6, ease: 'easeInOut' },
      },
    } satisfies Variants,
    c2: {} satisfies Variants,
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: GlobeProps) {
  const { controls } = useAnimateIconContext()
  const variants = getVariants(animations)

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        variants={variants.c0}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"
        variants={variants.c1}
        initial="initial"
        animate={controls}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <motion.path
        d="M2 12h20"
        variants={variants.c2}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  )
}

function Globe(props: GlobeProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  Globe,
  Globe as GlobeIcon,
  type GlobeProps,
  type GlobeProps as GlobeIconProps,
}
