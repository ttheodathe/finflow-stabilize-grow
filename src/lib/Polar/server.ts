import { Polar } from "@polar-sh/sdk";
import { POLAR_ENV } from "./config";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: POLAR_ENV,
});
