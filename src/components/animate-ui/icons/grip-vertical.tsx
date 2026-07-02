'use client'

import * as React from 'react'
import { motion, type Variants } from 'motion/react'

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon'

type GripVerticalProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    c0: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.4, 1],
        transition: { duration: 0.4, ease: 'easeInOut', delay: 0.0 },
      },
    } satisfies Variants,
    c1: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.4, 1],
        transition: { duration: 0.4, ease: 'easeInOut', delay: 0.05 },
      },
    } satisfies Variants,
    c2: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.4, 1],
        transition: { duration: 0.4, ease: 'easeInOut', delay: 0.1 },
      },
    } satisfies Variants,
    c3: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.4, 1],
        transition: { duration: 0.4, ease: 'easeInOut', delay: 0.15 },
      },
    } satisfies Variants,
    c4: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.4, 1],
        transition: { duration: 0.4, ease: 'easeInOut', delay: 0.2 },
      },
    } satisfies Variants,
    c5: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.4, 1],
        transition: { duration: 0.4, ease: 'easeInOut', delay: 0.25 },
      },
    } satisfies Variants,
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: GripVerticalProps) {
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
        cx="9"
        cy="12"
        r="1"
        variants={variants.c0}
        initial="initial"
        animate={controls}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <motion.circle
        cx="9"
        cy="5"
        r="1"
        variants={variants.c1}
        initial="initial"
        animate={controls}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <motion.circle
        cx="9"
        cy="19"
        r="1"
        variants={variants.c2}
        initial="initial"
        animate={controls}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <motion.circle
        cx="15"
        cy="12"
        r="1"
        variants={variants.c3}
        initial="initial"
        animate={controls}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <motion.circle
        cx="15"
        cy="5"
        r="1"
        variants={variants.c4}
        initial="initial"
        animate={controls}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <motion.circle
        cx="15"
        cy="19"
        r="1"
        variants={variants.c5}
        initial="initial"
        animate={controls}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
    </motion.svg>
  )
}

function GripVertical(props: GripVerticalProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  GripVertical,
  GripVertical as GripVerticalIcon,
  type GripVerticalProps,
  type GripVerticalProps as GripVerticalIconProps,
}
