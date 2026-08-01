import Image from "next/image";

export default function Home() {
  return (
    <div className="font-sans flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black">
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
          <div className="inline-flex items-center rounded-full bg-zinc-200 dark:bg-zinc-800 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            Final Polish
          </div>
          
          <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50 sm:text-5xl">
            We&apos;re Almost Finished! 🚀
          </h1>
          
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            We&apos;re putting the final touches on everything. It won&apos;t be long now—join our community for live updates and announcements.
          </p>
        </div>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black px-6 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200"
            href="https://dsc.gg/glxm"
            target="_blank"
            rel="noopener noreferrer"
          >
            Join dsc.gg/glxm
          </a>
        </div>
      </main>
    </div>
  );
}
