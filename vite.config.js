// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  //   plugins: [
  //   react({
  //     babel: {
  //       plugins: [['babel-plugin-react-compiler']],
  //     },
  //   }),
  // ],
  plugins: [react()],
  preview: {
    host: "0.0.0.0",
    allowedHosts: [
      "digiwppconnect-frontend.digibysr.in",
      "indianbaazaar.com",
      "www.indianbaazaar.com"
    ]
  }
});