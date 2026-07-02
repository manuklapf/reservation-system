'use client'

import * as React from 'react'
import { motion, type Variants } from 'motion/react'

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon'

type Building2Props = IconProps<keyof typeof animations>

const animations = {
  default: {
    c0: {} satisfies Variants,
    c1: {} satisfies Variants,
    c2: {} satisfies Variants,
    c3: {
      initial: { opacity: 1 },
      animate: {
        opacity: [1, 0.2, 1],
        transition: { duration: 0.5, ease: 'easeInOut', delay: 0.0 },
      },
    } satisfies Variants,
    c4: {
      initial: { opacity: 1 },
      animate: {
        opacity: [1, 0.2, 1],
        transition: { duration: 0.5, ease: 'easeInOut', delay: 0.08 },
      },
    } satisfies Variants,
    c5: {
      initial: { opacity: 1 },
      animate: {
        opacity: [1, 0.2, 1],
        transition: { duration: 0.5, ease: 'easeInOut', delay: 0.16 },
      },
    } satisfies Variants,
    c6: {
      initial: { opacity: 1 },
      animate: {
        opacity: [1, 0.2, 1],
        transition: { duration: 0.5, ease: 'easeInOut', delay: 0.24 },
      },
    } satisfies Variants,
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: Building2Props) {
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
        d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"
        variants={variants.c0}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"
        variants={variants.c1}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"
        variants={variants.c2}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M10 6h4"
        variants={variants.c3}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M10 10h4"
        variants={variants.c4}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M10 14h4"
        variants={variants.c5}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M10 18h4"
        variants={variants.c6}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  )
}

function Building2(props: Building2Props) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  Building2,
  Building2 as Building2Icon,
  type Building2Props,
  type Building2Props as Building2IconProps,
}
