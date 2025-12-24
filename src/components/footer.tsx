import Link from 'next/link'
import React from 'react'

const Footer = () => {
  return (
    <footer className=" mt-auto " role="contentinfo">
      <div className="flex mx-auto flex-row items-center justify-center gap-2 p-4 border-t border-gray-200">
        <span className="text-sm ">Made by</span>
        <Link href="https://github.com/viralcodex" aria-label="Visit Aviral Shukla's GitHub profile" target="_blank" rel="noopener noreferrer">
          <span className="text-sm text-blue-500 hover:underline">
            Aviral Shukla
          </span>
        </Link>
      </div>
    </footer>
  );
}

export default Footer