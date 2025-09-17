import Banner from "@/components/banner";
import MainContent from "@/components/maincontent";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex-grow px-6 md:p-6">
      <Banner />
      <div className="mx-auto max-w-4xl text-center">
        <p className="mt-4 lg:text-sm">
          Stay ahead of dependency risks. Visualize, detect, and fix
          vulnerabilities of your codebase — worry-free.
        </p>
        <p className="mb-4 lg:text-sm">
          Powered by <span className="font-bold">AI</span>
        </p>
      </div>
      <div className="flex justify-center items-center">
        <MainContent />
      </div>

      <div className="hidden sm:block absolute bottom-20 right-0 -z-10 w-[300px] h-[300px]">
        <Image
          priority
          src="/file.svg"
          alt="Skull dotted image"
          fill
          style={{ objectFit: "contain" }}
        />
      </div>
    </div>
  );
}
