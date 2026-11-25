import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const iconFontCss = `
  @font-face {
    font-family: "AIShieldIonicons";
    src: url("/fonts/Ionicons.ttf") format("truetype");
    font-display: block;
    font-style: normal;
    font-weight: normal;
  }

  [style*="font-family:ionicons"],
  [style*="font-family: ionicons"] {
    font-family: "AIShieldIonicons" !important;
  }
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="zh-Hant">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <link
          rel="preload"
          href="/fonts/Ionicons.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <style dangerouslySetInnerHTML={{ __html: iconFontCss }} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
