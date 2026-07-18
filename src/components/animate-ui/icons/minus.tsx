'use client'

import * as React from 'react'
import { motion, type Variants } from 'motion/react'

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon'

type MinusProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    line1: {
      initial: {
        x1: 5,
        x2: 19,
        transition: { ease: 'easeInOut', duration: 0.3 },
      },
      animate: {
        x1: 3.5,
        x2: 20.5,
        transition: { ease: 'easeInOut', duration: 0.3 },
      },
    },
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: MinusProps) {
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
      <motion.line
        x1={5}
        y1={12}
        x2={19}
        y2={12}
        variants={variants.line1}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  )
}

function Minus(props: MinusProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  Minus,
  Minus as MinusIcon,
  type MinusProps,
  type MinusProps as MinusIconProps,
}
