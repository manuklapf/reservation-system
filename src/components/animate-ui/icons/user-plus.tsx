'use client'

import * as React from 'react'
import { motion, type Variants } from 'motion/react'

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon'

type UserPlusProps = IconProps<keyof typeof animations>

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
    c3: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [0.05, 1],
        opacity: [0, 1],
        transition: { duration: 0.5, ease: 'easeInOut', delay: 0.12 },
      },
    } satisfies Variants,
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: UserPlusProps) {
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
      <motion.line
        x1="19"
        x2="19"
        y1="8"
        y2="14"
        variants={variants.c2}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1="22"
        x2="16"
        y1="11"
        y2="11"
        variants={variants.c3}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  )
}

function UserPlus(props: UserPlusProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  UserPlus,
  UserPlus as UserPlusIcon,
  type UserPlusProps,
  type UserPlusProps as UserPlusIconProps,
}
