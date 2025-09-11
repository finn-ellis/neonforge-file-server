// src/api.ts

// @ts-ignore
const dynamicApiUrl = window.API_URL;

export const API_BASE_URL = dynamicApiUrl || import.meta.env.VITE_API_URL;

console.log(`Using API_BASE_URL: ${API_BASE_URL}`);
