import Banner from "@/components/banner";
import MainContent from "@/components/maincontent";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex-grow px-6 md:p-6">
      <TooltipProvider>
      <Banner />
      <div className="mx-auto max-w-4xl text-center">
        <p className="mt-4 lg:text-md">
          Visualize and fix any <b>Github</b> repository&apos;s dependencies and
          their vulnerabilities.
        </p>
        <p className="mb-4 lg:text-md">
          Take action <b>Right Now</b> and be worry free!
        </p>
      </div>
      <div className="flex justify-center items-center">
        <MainContent />
      </div>
     
      <div className="hidden sm:block absolute bottom-20 right-0 -z-10 w-[300px] h-[300px]">
        <Image
          src="/file.svg"
          alt="Skull dotted image"
          fill
          style={{ objectFit: "contain" }}
        />
      </div>
      </TooltipProvider>
    </div>
  );
}