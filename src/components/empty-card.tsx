import Image from "next/image";
import React from "react";

interface EmptyCardProps {
  size: number;
}
const EmptyCard = (props: EmptyCardProps) => {
  const { size } = props;

  return (
    <div className="flex flex-col items-center justify-center p-10 text-center border-1 rounded-md bg-black/30 my-5" role="status" aria-label="No data available">
      <Image
        src="/coffee-cup.svg"
        alt="Empty coffee cup illustration"
        className="ml-3"
        width={size}
        height={size}
        aria-hidden="true"
      />
      <h3 className="text-lg text-muted-foreground w-full">
        This space is emptier than my coffee cup on a Monday morning...
      </h3>
    </div>
  );
};

export default EmptyCard;
