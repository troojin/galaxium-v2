import Image from "next/image";
export default function Home() {
  return (
    <div
      className="font-sans flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-black"
    >
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-8 py-32 px-16 text-center">
        <Image
          src="/icons/icon.png"
          alt="Logo"
          width={64}
          height={64}
          priority
          className="rounded-xl"
        />

        <div className="flex flex-col items-center gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Your project starts here
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Edit <code className="font-mono text-sm bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded">app/page.tsx</code> to get going.
          </p>
        </div>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            href="#"
          >
            Get Started
          </a>
          <a
            className="flex h-12 items-center justify-center rounded-full border border-solid border-black/[.08] px-6 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            href="#"
          >
            Learn More
          </a>
        </div>
      </main>
    </div>
  );
}