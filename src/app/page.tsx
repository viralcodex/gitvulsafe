import Banner from "@/components/banner";
import MainContent from "@/components/maincontent";
import Image from "next/image";

export default function Home() {
  return (
    <div className="h-full flex flex-col items-center justify-evenly">
      <div className="flex flex-col px-6 pt-10 items-center justify-evenly">
        <Banner />
        <div className="mx-auto max-w-4xl text-center">
          <p className="mt-4 text-md">
            Visualise, detect and fix dependency vulnerabilities of your
            codebase — worry-free.
          </p>
          <p className="lg:text-sm">
            Powered by <span className="font-bold">AI</span>
          </p>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-around items-center max-w-4xl w-full px-4 md:px-0">
        <MainContent />
      </div>
      <div className="hidden sm:block absolute top-30 left-0 -z-10 w-[300px] h-[300px] opacity-40">
        <Image
          priority
          src="/file.svg"
          alt="Decorative file icon"
          width={300}
          height={300}
          style={{ objectFit: "contain" }}
        />
      </div>
      <div className="hidden sm:block absolute bottom-10 right-0 -z-10 w-[300px] h-[300px] opacity-40">
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
