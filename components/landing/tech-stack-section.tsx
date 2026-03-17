"use client"

import LogoLoop from "@/components/LogoLoop"
import { motion } from "framer-motion"

const techLogos = [
  {
    title: "Next.js",
    src: "https://cdn.simpleicons.org/nextdotjs/white"
  },
  {
    title: "React",
    src: "https://cdn.simpleicons.org/react/white"
  },
  {
    title: "TypeScript",
    src: "https://cdn.simpleicons.org/typescript/white"
  },
  {
    title: "Tailwind CSS",
    src: "https://cdn.simpleicons.org/tailwindcss/white"
  },
  {
    title: "Framer Motion",
    src: "https://cdn.simpleicons.org/framer/white"
  },
  {
    title: "Vercel",
    src: "https://cdn.simpleicons.org/vercel/white"
  },
  {
    title: "OpenAI",
    src: "https://cdn.simpleicons.org/openai/white"
  },
  {
    title: "Docker",
    src: "https://cdn.simpleicons.org/docker/white"
  },
  {
    title: "Qwen",
    src: "/qwen.png"
  }
]

export function TechStackSection() {
  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 mb-8 text-center">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Powered by Modern Technology Stack
        </p>
      </div>

      <div className="relative w-full overflow-hidden mask-gradient-x">
        {/* @ts-ignore */}
        <LogoLoop
          logos={techLogos}
          speed={50}
          gap={60}
          logoHeight={40}
          pauseOnHover={true}
          direction="left"
          className="opacity-70 hover:opacity-100 transition-all duration-500"
        />
      </div>
    </section>
  )
}
