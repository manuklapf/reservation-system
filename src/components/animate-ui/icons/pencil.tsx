'use client'

import * as React from 'react'
import { motion, type Variants } from 'motion/react'

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon'

type PencilProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    c0: {
      initial: { x: 0, y: 0 },
      animate: {
        x: [0, 1.5, -1.5, 0],
        y: [0, -1.5, 1.5, 0],
        transition: { duration: 0.5, ease: 'easeInOut' },
      },
    } satisfies Variants,
    c1: {
      initial: { x: 0, y: 0 },
      animate: {
        x: [0, 1.5, -1.5, 0],
        y: [0, -1.5, 1.5, 0],
        transition: { duration: 0.5, ease: 'easeInOut' },
      },
    } satisfies Variants,
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: PencilProps) {
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
        d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"
        variants={variants.c0}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="m15 5 4 4"
        variants={variants.c1}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  )
}

function Pencil(props: PencilProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  Pencil,
  Pencil as PencilIcon,
  type PencilProps,
  type PencilProps as PencilIconProps,
}
