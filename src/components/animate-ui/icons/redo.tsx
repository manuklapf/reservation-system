'use client'

import * as React from 'react'
import { motion, type Variants } from 'motion/react'

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon'

type RedoProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    group: {
      initial: {
        rotate: 0,
        transition: { ease: 'easeInOut', duration: 0.3 },
      },
      animate: {
        rotate: 35,
        transition: { ease: 'easeInOut', duration: 0.3 },
      },
    },
    path1: {},
    path2: {},
  } satisfies Record<string, Variants>,
  'default-loop': {
    group: {
      initial: {
        rotate: 0,
      },
      animate: {
        rotate: [0, 35, 0],
        transition: { ease: 'easeInOut', duration: 0.6 },
      },
    },
    path1: {},
    path2: {},
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: RedoProps) {
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
      <motion.g
        variants={variants.group}
        initial="initial"
        animate={controls}
        style={{ transformOrigin: 'center' }}
      >
        <motion.path
          d="M3 7v6h6"
          variants={variants.path1}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"
          variants={variants.path2}
          initial="initial"
          animate={controls}
        />
      </motion.g>
    </motion.svg>
  )
}

function Redo(props: RedoProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  Redo,
  Redo as RedoIcon,
  type RedoProps,
  type RedoProps as RedoIconProps,
}
