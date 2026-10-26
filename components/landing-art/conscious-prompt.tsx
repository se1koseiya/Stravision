"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { useMascot } from "./mascot-context"

export function ConsciousPrompt() {
  const [response, setResponse] = useState<"none" | "now" | "wait">("none")
  const { setState } = useMascot()

  const handleInteraction = (type: "now" | "wait") => {
    setResponse(type)
    setState(type === "now" ? "active" : "waiting")
  }

  return (
    <section className="h-[80vh] relative z-10 flex flex-col justify-center items-center pointer-events-none">
      <div className="pointer-events-auto mix-blend-difference text-center">
        <AnimatePresence mode="wait">
          {response === "none" && (
            <motion.div
              key="question"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              exit={{ opacity: 0, filter: "blur(10px)" }}
              className="space-y-12"
            >
              <h3 className="text-4xl md:text-5xl text-white font-light tracking-widest">
                要我介入吗？
              </h3>
              <div className="flex gap-20 justify-center">
                <button
                  onClick={() => handleInteraction("now")}
                  onMouseEnter={() => setState("watching")}
                  className="text-muted-foreground hover:text-white transition-all duration-500 text-lg tracking-[0.2em]"
                >
                  现在
                </button>
                <button
                  onClick={() => handleInteraction("wait")}
                  onMouseEnter={() => setState("waiting")}
                  className="text-muted-foreground hover:text-white transition-all duration-500 text-lg tracking-[0.2em]"
                >
                  等等
                </button>
              </div>
            </motion.div>
          )}

          {response === "now" && (
            <motion.div
              key="now"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-red-500 font-jinbuti tracking-widest text-sm"
            >
              SYSTEM_ACTIVE // INTERVENTION_AUTHORIZED
            </motion.div>
          )}

          {response === "wait" && (
            <motion.div
              key="wait"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-muted-foreground font-jinbuti font-light tracking-widest"
            >
              我在这里。随时。
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
