import { hydrate } from "@tanstack/react-start";
import { getRouter } from "./router";
import { startInstance } from "./start";

console.log("Client-side hydration starting...");
const router = getRouter();

hydrate(router);
console.log("Client-side hydration complete.");