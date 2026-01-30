"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function EventFlagsTicker({ statements = [], autoPlayInterval = 5000 }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState("next");

  const goToNext = useCallback(() => {
    if (statements.length <= 1) return;
    setDirection("next");
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % statements.length);
      setIsAnimating(false);
    }, 300);
  }, [statements.length]);

  const goToPrev = useCallback(() => {
    if (statements.length <= 1) return;
    setDirection("prev");
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex(
        (prev) => (prev - 1 + statements.length) % statements.length,
      );
      setIsAnimating(false);
    }, 300);
  }, [statements.length]);

  const goToIndex = useCallback(
    (index) => {
      if (index === currentIndex || statements.length <= 1) return;
      setDirection(index > currentIndex ? "next" : "prev");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex(index);
        setIsAnimating(false);
      }, 300);
    },
    [currentIndex, statements.length],
  );

  // Auto-play logic
  useEffect(() => {
    if (isPaused || statements.length <= 1) return;

    const interval = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [isPaused, goToNext, autoPlayInterval, statements.length]);

  if (!statements.length) return null;

  const currentStatement = statements[currentIndex];

  return (
    <div
      className="relative overflow-hidden rounded-xl md:rounded-2xl lg:rounded-3xl bg-gradient-to-br from-primary/10 via-background to-background p-4 md:p-6 lg:p-8 border"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background effects - smaller on mobile */}
      <div className="absolute top-0 right-0 -mr-10 md:-mr-20 -mt-10 md:-mt-20 h-[150px] md:h-[300px] w-[150px] md:w-[300px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-10 md:-ml-20 -mb-10 md:-mb-20 h-[100px] md:h-[200px] w-[100px] md:w-[200px] rounded-full bg-blue-500/5 blur-3xl" />

      {/* Content area - stacked on mobile */}
      <div className="relative z-10 flex flex-col gap-3">
        {/* Statement Container */}
        <div className="flex-1 min-h-[50px] md:min-h-[60px] flex items-center justify-center overflow-hidden px-2">
          <div
            className={cn(
              "transition-all duration-300 ease-in-out",
              isAnimating &&
                direction === "next" &&
                "translate-x-4 md:translate-x-8 opacity-0",
              isAnimating &&
                direction === "prev" &&
                "-translate-x-4 md:-translate-x-8 opacity-0",
            )}
          >
            <p className="text-sm md:text-lg lg:text-xl text-muted-foreground text-center leading-relaxed">
              {currentStatement?.content}
            </p>
          </div>
        </div>

        {/* Navigation row - dots and arrows together */}
        {statements.length > 1 && (
          <div className="relative z-10 flex items-center justify-center gap-2 md:gap-6 pt-2">
            {/* Left Arrow */}
            <button
              onClick={goToPrev}
              className="group shrink-0 p-3 md:p-2 rounded-full hover:bg-muted/50 transition-all duration-200 text-muted-foreground hover:text-foreground active:scale-95 touch-manipulation"
              aria-label="Previous statement"
            >
              <ChevronLeft className="w-5 h-5 md:w-5 md:h-5" />
            </button>

            {/* Dot indicators */}
            <div className="flex items-center gap-1.5 md:gap-2 px-2">
              {statements.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToIndex(index)}
                  className={cn(
                    "rounded-full transition-all duration-300 touch-manipulation !min-h-0 !p-0",
                    index === currentIndex
                      ? "bg-primary !w-2.5 !h-1.5 md:w-6 md:h-2"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50 !w-1.5 !h-1.5 md:w-2 md:h-2",
                  )}
                  aria-label={`Go to statement ${index + 1}`}
                />
              ))}
            </div>

            {/* Right Arrow */}
            <button
              onClick={goToNext}
              className="group shrink-0 p-3 md:p-2 rounded-full hover:bg-muted/50 transition-all duration-200 text-muted-foreground hover:text-foreground active:scale-95 touch-manipulation"
              aria-label="Next statement"
            >
              <ChevronRight className="w-5 h-5 md:w-5 md:h-5" />
            </button>
          </div>
        )}

        {/* Source label */}
        {currentStatement?.source && (
          <div className="relative z-10 flex justify-center">
            <span className="text-[10px] md:text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">
              {currentStatement.source}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
