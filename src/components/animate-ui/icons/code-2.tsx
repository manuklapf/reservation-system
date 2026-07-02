'use client'

import * as React from 'react'
import { motion, type Variants } from 'motion/react'

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon'

type Code2Props = IconProps<keyof typeof animations>

const animations = {
  default: {
    c0: {
      initial: { x: 0 },
      animate: { x: 2, transition: { duration: 0.3, ease: 'easeInOut' } },
    } satisfies Variants,
    c1: {
      initial: { x: 0 },
      animate: { x: -2, transition: { duration: 0.3, ease: 'easeInOut' } },
    } satisfies Variants,
    c2: {} satisfies Variants,
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: Code2Props) {
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
        d="m18 16 4-4-4-4"
        variants={variants.c0}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="m6 8-4 4 4 4"
        variants={variants.c1}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="m14.5 4-5 16"
        variants={variants.c2}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  )
}

function Code2(props: Code2Props) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  Code2,
  Code2 as Code2Icon,
  type Code2Props,
  type Code2Props as Code2IconProps,
}
