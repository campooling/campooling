const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    sw.skipWaiting();
  }
});
