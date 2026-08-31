"use client";
import dynamic from "next/dynamic";

// react-leaflet touches window at import time, so it must be excluded from
// prerendering/SSR entirely. next/dynamic's ssr:false only works inside a
// Client Component, hence this wrapper around the Server Component page.
const AllLeaflet = dynamic(() => import("./AllLeaflet"), { ssr: false });

export default AllLeaflet;
