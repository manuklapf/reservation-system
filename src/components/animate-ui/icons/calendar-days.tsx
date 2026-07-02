'use client'

import * as React from 'react'
import { motion, type Variants } from 'motion/react'

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon'

type CalendarDaysProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    c0: {} satisfies Variants,
    c1: {} satisfies Variants,
    c2: {} satisfies Variants,
    c3: {} satisfies Variants,
    c4: {
      initial: { opacity: 1 },
      animate: {
        opacity: [1, 0.2, 1],
        transition: { duration: 0.5, ease: 'easeInOut', delay: 0.0 },
      },
    } satisfies Variants,
    c5: {
      initial: { opacity: 1 },
      animate: {
        opacity: [1, 0.2, 1],
        transition: { duration: 0.5, ease: 'easeInOut', delay: 0.06 },
      },
    } satisfies Variants,
    c6: {
      initial: { opacity: 1 },
      animate: {
        opacity: [1, 0.2, 1],
        transition: { duration: 0.5, ease: 'easeInOut', delay: 0.12 },
      },
    } satisfies Variants,
    c7: {
      initial: { opacity: 1 },
      animate: {
        opacity: [1, 0.2, 1],
        transition: { duration: 0.5, ease: 'easeInOut', delay: 0.18 },
      },
    } satisfies Variants,
    c8: {
      initial: { opacity: 1 },
      animate: {
        opacity: [1, 0.2, 1],
        transition: { duration: 0.5, ease: 'easeInOut', delay: 0.24 },
      },
    } satisfies Variants,
    c9: {
      initial: { opacity: 1 },
      animate: {
        opacity: [1, 0.2, 1],
        transition: { duration: 0.5, ease: 'easeInOut', delay: 0.3 },
      },
    } satisfies Variants,
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: CalendarDaysProps) {
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
        d="M8 14h.01"
        variants={variants.c4}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M12 14h.01"
        variants={variants.c5}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M16 14h.01"
        variants={variants.c6}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M8 18h.01"
        variants={variants.c7}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M12 18h.01"
        variants={variants.c8}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M16 18h.01"
        variants={variants.c9}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  )
}

function CalendarDays(props: CalendarDaysProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  CalendarDays,
  CalendarDays as CalendarDaysIcon,
  type CalendarDaysProps,
  type CalendarDaysProps as CalendarDaysIconProps,
}
