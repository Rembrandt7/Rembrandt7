
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// --- INTERCEPT FETCH FOR PROXY ---
// To evade corporate firewalls, all calls to Google Gemini API from the client 
// (which are performed by @google/genai via global fetch) are intercepted and 
// routed to our local NodeJS proxy endpoint.
const originalFetch = window.fetch;
window.fetch = async function (...args) {
    let url = args[0];
    const options = args[1];

    let targetUrlObj: URL | undefined;

    try {
        if (typeof url === 'string') {
            targetUrlObj = new URL(url);
        } else if (url instanceof Request) {
            targetUrlObj = new URL(url.url);
        }
    } catch(e) {}

    if (targetUrlObj && targetUrlObj.hostname === 'generativelanguage.googleapis.com') {
        const proxyUrl = targetUrlObj.href.replace('https://generativelanguage.googleapis.com', '/api/proxy/google');
        
        if (typeof url === 'string') {
            args[0] = proxyUrl;
        } else if (url instanceof Request) {
            try {
                // Safely recreate request avoiding body stream locking issues
                const init: RequestInit = {
                    method: url.method,
                    headers: url.headers,
                    mode: url.mode,
                    credentials: url.credentials,
                    cache: url.cache,
                    redirect: url.redirect,
                    referrer: url.referrer,
                    referrerPolicy: url.referrerPolicy,
                    integrity: url.integrity,
                    keepalive: url.keepalive,
                    signal: url.signal,
                };

                // Request body cannot be extracted cleanly if used. Try to get it.
                if (options?.body) {
                   init.body = options.body;
                } else if (url.method !== 'GET' && url.method !== 'HEAD' && !url.bodyUsed && url.body) {
                   init.body = url.body;
                }

                args[0] = proxyUrl;
                args[1] = init;
            } catch (err) {
                console.error("[Fetch Interceptor] Error cloning Request:", err);
            }
        }
    }

    return originalFetch.apply(window, args as any);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
       <App />
    </ErrorBoundary>
  </React.StrictMode>
);
