'use client'

import * as React from 'react'
import { motion, type Variants } from 'motion/react'

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon'

type LayoutGridProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    c0: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 0.8, 1],
        transition: { duration: 0.4, ease: 'easeInOut', delay: 0.0 },
      },
    } satisfies Variants,
    c1: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 0.8, 1],
        transition: { duration: 0.4, ease: 'easeInOut', delay: 0.08 },
      },
    } satisfies Variants,
    c2: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 0.8, 1],
        transition: { duration: 0.4, ease: 'easeInOut', delay: 0.16 },
      },
    } satisfies Variants,
    c3: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 0.8, 1],
        transition: { duration: 0.4, ease: 'easeInOut', delay: 0.24 },
      },
    } satisfies Variants,
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: LayoutGridProps) {
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
      <motion.rect
        width="7"
        height="7"
        x="3"
        y="3"
        rx="1"
        variants={variants.c0}
        initial="initial"
        animate={controls}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <motion.rect
        width="7"
        height="7"
        x="14"
        y="3"
        rx="1"
        variants={variants.c1}
        initial="initial"
        animate={controls}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <motion.rect
        width="7"
        height="7"
        x="14"
        y="14"
        rx="1"
        variants={variants.c2}
        initial="initial"
        animate={controls}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <motion.rect
        width="7"
        height="7"
        x="3"
        y="14"
        rx="1"
        variants={variants.c3}
        initial="initial"
        animate={controls}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
    </motion.svg>
  )
}

function LayoutGrid(props: LayoutGridProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  LayoutGrid,
  LayoutGrid as LayoutGridIcon,
  type LayoutGridProps,
  type LayoutGridProps as LayoutGridIconProps,
}
