'use client'

import * as React from 'react'
import { motion, type Variants } from 'motion/react'

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon'

type UserCheckProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    c0: {} satisfies Variants,
    c1: {} satisfies Variants,
    c2: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [0.05, 1],
        opacity: [0, 1],
        transition: { duration: 0.5, ease: 'easeInOut', delay: 0 },
      },
    } satisfies Variants,
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: UserCheckProps) {
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
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        variants={variants.c0}
        initial="initial"
        animate={controls}
      />
      <motion.circle
        cx="9"
        cy="7"
        r="4"
        variants={variants.c1}
        initial="initial"
        animate={controls}
      />
      <motion.polyline
        points="16 11 18 13 22 9"
        variants={variants.c2}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  )
}

function UserCheck(props: UserCheckProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  UserCheck,
  UserCheck as UserCheckIcon,
  type UserCheckProps,
  type UserCheckProps as UserCheckIconProps,
}
