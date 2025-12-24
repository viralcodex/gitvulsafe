import React from "react";

const Banner = () => {
  return (
    <section className="sm:mb-5 mt-5 mb-2 relative" role="banner" aria-label="Hero section">
      {/* Background SVG for large screens, hidden on small screens */}
      <div className="relative">
        <div className="relative z-10 text-center">
          <h1 className="lg:text-7xl sm:text-5xl text-[40px] sm:leading-20 leading-12 font-bold tracking-tighter">
            Secure your <em>Deps</em> ! <br />
            Ship with confidence
          </h1>
        </div>
      </div>
    </section>
  );
};

export default Banner;
