'use client'

import * as React from 'react'
import { motion, type Variants } from 'motion/react'

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon'

type InfoProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    c0: {} satisfies Variants,
    c1: {
      initial: { y: 0 },
      animate: {
        y: [0, -1.5, 0],
        transition: { duration: 0.4, ease: 'easeInOut' },
      },
    } satisfies Variants,
    c2: {
      initial: { y: 0 },
      animate: {
        y: [0, -1.5, 0],
        transition: { duration: 0.4, ease: 'easeInOut' },
      },
    } satisfies Variants,
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: InfoProps) {
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
        d="M12 16v-4"
        variants={variants.c1}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M12 8h.01"
        variants={variants.c2}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  )
}

function Info(props: InfoProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  Info,
  Info as InfoIcon,
  type InfoProps,
  type InfoProps as InfoIconProps,
}
