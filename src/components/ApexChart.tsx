'use client'
/**
 * SSR-safe wrapper around react-apexcharts.
 * ApexCharts uses browser APIs (window/document) that are unavailable during
 * Next.js server-side rendering, so we must load it dynamically with ssr:false.
 */
import dynamic from 'next/dynamic'

const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

export default ApexChart
