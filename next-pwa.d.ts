declare module "next-pwa" {
  import type { NextConfig } from "next";

  interface PwaOptions {
    dest: string;
    disable?: boolean;
    [key: string]: unknown;
  }

  export default function withPWA(options: PwaOptions): (config: NextConfig) => NextConfig;
}
