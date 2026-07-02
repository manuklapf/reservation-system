'use client'

import * as React from 'react'
import { motion, type Variants } from 'motion/react'

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon'

type CalendarCheckProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    c0: {} satisfies Variants,
    c1: {} satisfies Variants,
    c2: {} satisfies Variants,
    c3: {} satisfies Variants,
    c4: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [0.05, 1],
        opacity: [0, 1],
        transition: { duration: 0.5, ease: 'easeInOut', delay: 0 },
      },
    } satisfies Variants,
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: CalendarCheckProps) {
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
      <motion.rect
        width="18"
        height="18"
        x="3"
        y="4"
        rx="2"
        ry="2"
        variants={variants.c0}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1="16"
        x2="16"
        y1="2"
        y2="6"
        variants={variants.c1}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1="8"
        x2="8"
        y1="2"
        y2="6"
        variants={variants.c2}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1="3"
        x2="21"
        y1="10"
        y2="10"
        variants={variants.c3}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="m9 16 2 2 4-4"
        variants={variants.c4}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  )
}

function CalendarCheck(props: CalendarCheckProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  CalendarCheck,
  CalendarCheck as CalendarCheckIcon,
  type CalendarCheckProps,
  type CalendarCheckProps as CalendarCheckIconProps,
}
