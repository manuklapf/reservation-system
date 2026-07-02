'use client'

import * as React from 'react'
import { motion, type Variants } from 'motion/react'

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon'

type UtensilsCrossedProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    c0: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [0.05, 1],
        opacity: [0, 1],
        transition: { duration: 0.5, ease: 'easeInOut', delay: 0.0 },
      },
    } satisfies Variants,
    c1: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [0.05, 1],
        opacity: [0, 1],
        transition: { duration: 0.5, ease: 'easeInOut', delay: 0.08 },
      },
    } satisfies Variants,
    c2: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [0.05, 1],
        opacity: [0, 1],
        transition: { duration: 0.5, ease: 'easeInOut', delay: 0.16 },
      },
    } satisfies Variants,
    c3: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [0.05, 1],
        opacity: [0, 1],
        transition: { duration: 0.5, ease: 'easeInOut', delay: 0.24 },
      },
    } satisfies Variants,
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: UtensilsCrossedProps) {
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
      <motion.path
        d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"
        variants={variants.c0}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"
        variants={variants.c1}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="m2.1 21.8 6.4-6.3"
        variants={variants.c2}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="m19 5-7 7"
        variants={variants.c3}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  )
}

function UtensilsCrossed(props: UtensilsCrossedProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  UtensilsCrossed,
  UtensilsCrossed as UtensilsCrossedIcon,
  type UtensilsCrossedProps,
  type UtensilsCrossedProps as UtensilsCrossedIconProps,
}
