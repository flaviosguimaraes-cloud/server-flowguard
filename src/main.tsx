import { hydrate } from "@tanstack/react-start";
import { getRouter } from "./router";
import { startInstance } from "./start";

const router = getRouter();

hydrate(router, startInstance);