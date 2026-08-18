import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 text-neutral-100 px-6 select-none">
      <div className="flex flex-col items-center max-w-md w-full text-center space-y-8 animate-in fade-in duration-500">

        {/* Branding Icon / Logo Container */}
        <div className="flex justify-center">
          <div className="rounded-xl bg-neutral-900 p-4 border border-neutral-800 shadow-inner">
            {/* Minimalist AHS icon representation */}
            <svg
              className="h-10 w-10 text-neutral-100"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 20h18" />
              <path d="M12 4l-8 16" />
              <path d="M12 4l8 16" />
              <path d="M8 14h8" />
            </svg>
          </div>
        </div>

        {/* Title and description */}
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            Ananya Hi Solutions
          </h1>
          <p className="text-neutral-400 text-base md:text-lg max-w-xs mx-auto font-normal leading-relaxed">
            Internal portal for authorized team members.
          </p>
        </div>

        {/* Actions layout */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full pt-4">
          <Link
            href="/login"
            className="flex items-center justify-center w-full sm:w-auto rounded-lg bg-neutral-100 px-6 py-2.5 text-sm font-semibold text-neutral-950 shadow hover:bg-neutral-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 focus:ring-offset-neutral-950"
          >
            Team Member Login
          </Link>
          <a
            href="https://ananyahisolutions.com/"
            className="flex items-center justify-center w-full sm:w-auto rounded-lg border border-neutral-850 bg-neutral-900/50 px-6 py-2.5 text-sm font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 hover:border-neutral-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-700 focus:ring-offset-2 focus:ring-offset-neutral-950"
          >
            Visit Company Website
          </a>
        </div>
      </div>
    </div>
  );
}
