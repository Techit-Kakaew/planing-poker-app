"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { POKER_CARDS, POKER_GRADIENTS } from "@/constants/poker";

const length = POKER_CARDS.length;
const maxValue = 40;
const center = (length - 1) / 2;

const values = Array.from({ length }, (_, i) => {
  const distanceFromCenter = Math.abs(i - center);
  const translateY = Math.round(
    maxValue * (1 - Math.pow(distanceFromCenter / center, 2)),
  );
  const rotateZ = (i - center) * 4;
  return { translateY, rotateZ };
});

interface PokerCardProps {
  currentCard: string | null;
  loadingCard: string | null;
  isDisabled: boolean;
  onCardClick: (card: string) => void;
}

const PokerCard = ({
  currentCard,
  loadingCard,
  isDisabled,
  onCardClick,
}: PokerCardProps) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay to trigger the "fan out" animation
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex w-full items-center justify-center py-12 px-10 overflow-visible">
      <div className="flex items-center justify-center">
        {POKER_CARDS.map((card, index) => {
          const { translateY, rotateZ } = values[index];
          const isSelected = card === currentCard;
          const isLoading = card === loadingCard;

          return (
            <div
              key={card}
              className={cn(
                `relative h-[150px] w-[100px] cursor-pointer rounded-2xl bg-linear-to-b ${
                  POKER_GRADIENTS[index]
                } p-4 text-2xl font-black text-white shadow-2xl transition-all duration-300 flex items-start justify-start select-none`,
                {
                  "-ml-[50px]": isReady && index > 0,
                  "-ml-[100px]": !isReady && index > 0,
                  "-mt-20 scale-110 ring-4 ring-white/50":
                    isSelected || isLoading,
                  "hover:-mt-20 hover:z-50 hover:scale-105": !isDisabled,
                  "cursor-not-allowed opacity-50":
                    isDisabled && !isSelected && !isLoading,
                  "opacity-100": !isDisabled || isSelected || isLoading,
                },
              )}
              style={{
                transform: `translateY(-${isReady ? translateY : 0}px) rotateZ(${
                  isReady ? rotateZ : 0
                }deg)`,
                zIndex: index,
              }}
              onClick={isDisabled ? undefined : () => onCardClick(card)}
            >
              <span className="leading-none">{card}</span>
              {isLoading ? (
                <div className="absolute top-2 right-2 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin opacity-80" />
                </div>
              ) : (
                isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <div
                      className={`${card === "?" ? "bg-slate-400" : card === "☕" ? "bg-amber-600" : "bg-indigo-600"} w-4 h-4 rounded-full flex items-center justify-center`}
                    >
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PokerCard;
