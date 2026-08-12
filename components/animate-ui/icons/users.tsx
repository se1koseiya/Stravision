'use client';

import * as React from 'react';
import { motion, type Variants } from "framer-motion";

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type UsersProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    path1: {
      initial: {
        y: 0,
      },
      animate: {
        y: [0, 2, -2, 0],
        transition: {
          duration: 0.6,
          ease: 'easeInOut',
          delay: 0.1,
        },
      },
    },
    path2: {
      initial: {
        y: 0,
      },
      animate: {
        y: [0, 4, -2, 0],
        transition: {
          duration: 0.6,
          ease: 'easeInOut',
        },
      },
    },
    path3: {
      initial: {
        y: 0,
      },
      animate: {
        y: [0, 2, -2, 0],
        transition: {
          duration: 0.6,
          ease: 'easeInOut',
        },
      },
    },
    circle: {
      initial: {
        y: 0,
      },
      animate: {
        y: [0, 4, -2, 0],
        transition: {
          duration: 0.6,
          ease: 'easeInOut',
          delay: 0.1,
        },
      },
    },
  } satisfies Record<string, Variants>,
  appear: {
    path1: {},
    path2: {
      initial: {
        x: -6,
        opacity: 0,
      },
      animate: {
        x: 0,
        opacity: 1,
        transition: {
          type: 'spring',
          stiffness: 100,
          damping: 10,
        },
      },
    },
    path3: {
      initial: {
        x: -6,
        opacity: 0,
      },
      animate: {
        x: 0,
        opacity: 1,
        transition: {
          type: 'spring',
          stiffness: 100,
          damping: 10,
        },
      },
    },
    circle: {},
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: UsersProps) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);

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
        variants={variants.path1}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M16 3.128a4 4 0 0 1 0 7.744"
        variants={variants.path2}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M22 21v-2a4 4 0 0 0-3-3.87"
        variants={variants.path3}
        initial="initial"
        animate={controls}
      />
      <motion.circle
        cx={9}
        cy={7}
        r={4}
        variants={variants.circle}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}

function Users(props: UsersProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

type UserPlusProps = IconProps<keyof typeof userPlusAnimations>;

const userPlusAnimations = {
  default: {
    path1: {
      initial: { y: 0 },
      animate: {
        y: [0, 2, -2, 0],
        transition: { duration: 0.6, ease: 'easeInOut', delay: 0.1 },
      },
    },
    circle: {
      initial: { y: 0 },
      animate: {
        y: [0, 4, -2, 0],
        transition: { duration: 0.6, ease: 'easeInOut', delay: 0.1 },
      },
    },
    line1: {
      initial: { pathLength: 1 },
      animate: {
        pathLength: [1, 0.6, 1],
        transition: { duration: 0.6, ease: 'easeInOut' },
      },
    },
    line2: {
      initial: { pathLength: 1 },
      animate: {
        pathLength: [1, 0.6, 1],
        transition: { duration: 0.6, ease: 'easeInOut', delay: 0.05 },
      },
    },
  } satisfies Record<string, Variants>,
  appear: {
    path1: {},
    circle: {},
    line1: {
      initial: { pathLength: 0, opacity: 0 },
      animate: {
        pathLength: 1,
        opacity: 1,
        transition: {
          duration: 0.4,
          ease: 'easeInOut',
          delay: 0.2,
        },
      },
    },
    line2: {
      initial: { pathLength: 0, opacity: 0 },
      animate: {
        pathLength: 1,
        opacity: 1,
        transition: {
          duration: 0.4,
          ease: 'easeInOut',
          delay: 0.3,
        },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function UserPlusIconComponent({ size, ...props }: UserPlusProps) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(userPlusAnimations);

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
        variants={variants.path1}
        initial="initial"
        animate={controls}
      />
      <motion.circle
        cx={9}
        cy={7}
        r={4}
        variants={variants.circle}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1={19}
        x2={19}
        y1={8}
        y2={14}
        variants={variants.line1}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1={22}
        x2={16}
        y1={11}
        y2={11}
        variants={variants.line2}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}

function UserPlus(props: UserPlusProps) {
  return <IconWrapper icon={UserPlusIconComponent} {...props} />;
}

export {
  animations,
  Users,
  Users as UsersIcon,
  type UsersProps,
  type UsersProps as UsersIconProps,
  userPlusAnimations,
  UserPlus,
  UserPlus as UserPlusIcon,
  type UserPlusProps,
  type UserPlusProps as UserPlusIconProps,
};
