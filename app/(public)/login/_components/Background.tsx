"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  MotionValue,
} from "motion/react";
import { useEffect, useSyncExternalStore } from "react";

function FloatingElement({
  delay,
  initialX,
  initialY,
  size,
  color,
  mouseX,
  mouseY,
  driftX,
  driftY,
  duration,
}: {
  delay: number;
  initialX: number;
  initialY: number;
  size: number;
  color: string;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  driftX: number;
  driftY: number;
  duration: number;
}) {
  const dx = useTransform(mouseX, (x) => {
    const distance = x - initialX;
    if (Math.abs(distance) < 400) {
      return (distance > 0 ? -1 : 1) * (400 - Math.abs(distance)) * 0.2;
    }
    return 0;
  });

  const dy = useTransform(mouseY, (y) => {
    const distance = y - initialY;
    if (Math.abs(distance) < 400) {
      return (distance > 0 ? -1 : 1) * (400 - Math.abs(distance)) * 0.2;
    }
    return 0;
  });

  // Smooth out the interaction
  const springX = useSpring(dx, { stiffness: 150, damping: 20 });
  const springY = useSpring(dy, { stiffness: 150, damping: 20 });

  return (
    <motion.div
      style={{
        position: "absolute",
        left: initialX,
        top: initialY,
        x: springX,
        y: springY,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.2, 1],
          x: [0, driftX, 0],
          y: [0, driftY, 0],
        }}
        transition={{
          duration,
          repeat: Infinity,
          delay: delay,
          ease: "easeInOut",
        }}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: color,
          filter: "blur(30px)",
          // Center the element relative to its position point
          transform: "translate(-50%, -50%)",
        }}
      />
    </motion.div>
  );
}

interface Element {
  id: number;
  initialX: number;
  initialY: number;
  size: number;
  delay: number;
  color: string;
  driftX: number;
  driftY: number;
  duration: number;
}

export function Background() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const elements = useSyncExternalStore<Element[]>(
    () => {
      return () => {};
    },
    () => {
      if (typeof window === "undefined") return [];

      return Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        initialX: Math.random() * window.innerWidth,
        initialY: Math.random() * window.innerHeight,
        size: 100 + Math.random() * 300,
        delay: Math.random() * 5,
        color: i % 2 === 0 ? "#60a5fa" : "#38bdf8",
        driftX: Math.random() * 50 - 25,
        driftY: Math.random() * 50 - 25,
        duration: 10 + Math.random() * 10,
      }));
    },
    () => [],
  );

  const moveX = useSpring(0, { stiffness: 50, damping: 20 });
  const moveY = useSpring(0, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;

      mouseX.set(clientX);
      mouseY.set(clientY);

      const x = (clientX / window.innerWidth - 0.5) * 20;
      const y = (clientY / window.innerHeight - 0.5) * 20;
      moveX.set(x);
      moveY.set(y);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [moveX, moveY, mouseX, mouseY]);


  return (
    <motion.div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-white"
      style={{ x: moveX, y: moveY }}
    >
      {elements.map((el) => (
        <FloatingElement
          key={el.id}
          delay={el.delay}
          initialX={el.initialX}
          initialY={el.initialY}
          size={el.size}
          color={el.color}
          mouseX={mouseX}
          mouseY={mouseY}
          driftX={el.driftX}
          driftY={el.driftY}
          duration={el.duration}
        />
      ))}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[60px]" />
    </motion.div>
  );
}
