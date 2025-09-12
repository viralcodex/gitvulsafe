import React from 'react'
import Image from 'next/image'

const Banner = () => {
  return (
    <div className="mt-10 mb-5 relative">
      {/* Background SVG for large screens, hidden on small screens */}
      <div className='relative'>
        <div className="hidden sm:block absolute -top-10 left-0 -z-10 w-[300px] h-[300px]">
          <Image
            src="/file.svg"
            alt="Skull dotted image"
            fill
            style={{ objectFit: "contain" }}
          />
        </div>
        <div className="relative z-10 text-center">
          <h1 className="lg:text-7xl text-5xl font-bold tracking-tighter">
            Secure your deps, <br />
            Ship with confidence.
          </h1>
        </div>
      </div>
    </div>
  );
}

export default Banner