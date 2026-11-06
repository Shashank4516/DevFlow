/**
 * Answers every axios and fetch call to the backend in the browser. Loaded lazily
 * from `src/index.tsx` so that the mocks and sample data stay out of normal builds.
 */
import axios from "axios";
import { handleDemoRequest, type DemoRequest } from "./demoServer";

const LATENCY_MS = 40;
const wait = () => new Promise(resolve => setTimeout(resolve, LATENCY_MS));

const parseBody = (raw: unknown) => {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const toRequest = (
  method: string | undefined,
  url: string,
  params: unknown,
  body: unknown,
): DemoRequest => {
  const parsed = new URL(url, window.location.origin);
  return {
    method: (method || "get").toLowerCase(),
    path: parsed.pathname,
    query: {
      ...Object.fromEntries(parsed.searchParams.entries()),
      ...((params as object) || {}),
    },
    body: parseBody(body),
  };
};

const installAxiosMock = () => {
  axios.defaults.adapter = async config => {
    await wait();
    const { status, data } = handleDemoRequest(
      toRequest(config.method, config.url || "", config.params, config.data),
    );
    const response = {
      data,
      status,
      statusText: String(status),
      headers: {},
      config,
      request: {},
    };
    if (status >= 200 && status < 300) return response;
    return Promise.reject(
      new axios.AxiosError(
        data?.error || "Demo request failed",
        undefined,
        config,
        undefined,
        response,
      ),
    );
  };
};

const installFetchMock = () => {
  const backendUrl = String(import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");
  const realFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (!backendUrl || !url.startsWith(backendUrl)) {
      return realFetch(input, init);
    }
    await wait();
    const { status, data } = handleDemoRequest(
      toRequest(init?.method, url, undefined, init?.body),
    );
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  };
};

export const installDemoMode = () => {
  installAxiosMock();
  installFetchMock();
};
