'use client'

import * as React from 'react'
import { motion, type Variants } from 'motion/react'

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon'

type CircleHelpProps = IconProps<keyof typeof animations>

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

function IconComponent({ size, ...props }: CircleHelpProps) {
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
        d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
        variants={variants.c1}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M12 17h.01"
        variants={variants.c2}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  )
}

function CircleHelp(props: CircleHelpProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  CircleHelp,
  CircleHelp as CircleHelpIcon,
  type CircleHelpProps,
  type CircleHelpProps as CircleHelpIconProps,
}
