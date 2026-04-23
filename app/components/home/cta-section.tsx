import Link from "next/link";
import { Caveat } from "next/font/google";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "600"],
});

const AVATAR_SRC = [
  "/games/icons/cod-bo3.png",
  "/games/icons/cod-bocw.png",
  "/games/icons/cod-ghosts.png",
  "/games/icons/cod-iw.png",
  "/games/icons/cod4.png",
  "/games/icons/cod-mw2.png",
] as const;

function CtaArrow() {
  return (
    <svg
      width="77"
      height="80"
      viewBox="0 0 77 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-white"
      aria-hidden
    >
      <path
        d="M75.4725 60.0021C45.5073 65.1045 23.2825 43.9431 11.4282 18.1701C11.2238 17.7278 10.6987 17.5325 10.2564 17.7369C9.8141 17.9414 9.61882 18.4664 9.82326 18.9087C22.008 45.4042 44.9655 66.9889 75.7702 61.743C76.2503 61.6623 76.5733 61.2059 76.4919 60.7237C76.4111 60.2436 75.9547 59.9207 75.4725 60.0021Z"
        fill="currentColor"
      />
      <path
        d="M10.846 19.02C12.1043 19.929 13.6707 21.0873 13.8523 21.2135C18.7735 24.635 23.9617 27.1097 29.6911 28.9119C30.156 29.0588 30.653 28.799 30.7998 28.3342C30.9467 27.8693 30.6869 27.3724 30.2221 27.2255C24.6657 25.4797 19.6334 23.0811 14.8601 19.7616C14.5818 19.5683 11.062 16.9624 10.3108 16.4889C10.0035 16.2933 9.76888 16.278 9.71317 16.2797C9.41708 16.2773 9.22434 16.3985 9.09505 16.5201C8.95011 16.6585 8.76658 16.9454 8.76869 17.3853C8.77276 17.8457 9.01473 18.7939 9.05649 19.0381C9.67624 22.7255 10.6892 26.7869 10.8614 30.7273C11.0258 34.485 10.4248 38.1371 7.83746 41.1938C7.52215 41.5656 7.56983 42.1244 7.94168 42.4397C8.31352 42.755 8.8723 42.7074 9.18761 42.3355C12.0796 38.9175 12.8109 34.8503 12.6274 30.6511C12.4558 26.734 11.4799 22.7004 10.846 19.02Z"
        fill="currentColor"
      />
    </svg>
  );
}

type CtaSectionProps = {
  titleFontClassName?: string;
};

export function CtaSection({ titleFontClassName }: CtaSectionProps) {
  return (
    <section
      id="cta"
      className="w-full overflow-x-hidden bg-black py-32"
      aria-labelledby="cta-heading"
    >
      <div className="flex flex-col items-center justify-center px-4">
        <div className="flex pl-2">
          {AVATAR_SRC.map((src) => (
            <Avatar
              key={src}
              className="relative -mr-4 size-14 p-1 overflow-hidden rounded-full border border-white/15 bg-black ring-2 ring-black"
            >
              <AvatarImage src={src} alt="" />
            </Avatar>
          ))}
        </div>

        <header className="mt-8 max-w-4xl text-center sm:mt-10">
          <h2
            id="cta-heading"
            className={cn(
              titleFontClassName,
              "text-balance text-4xl font-semibold tracking-tighter text-white lg:text-7xl",
            )}
          >
            Get started now
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-center text-lg text-zinc-400 md:text-2xl">
            Access tools, features and resources through a clean platform. Start free and upgrade anytime.
          </p>
        </header>

        <div className="group mt-2">
          <div className="relative flex items-center justify-center">
            <Button
              asChild
              className="mt-6 h-12 shrink-0 rounded-2xl px-6 text-lg"
            >
              <Link href="/dashboard">Get started now</Link>
            </Button>
            <div
              className={cn(
                caveat.className,
                "pointer-events-none absolute -bottom-20 -right-6 flex items-end md:-right-40 lg:-right-52",
              )}
            >
              <CtaArrow />
              <p className="mb-1 ml-1 max-w-44 text-xl tracking-tight text-zinc-100 sm:max-w-none">
                No signup required — enjoy!
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
