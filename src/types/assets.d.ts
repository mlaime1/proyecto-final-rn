// Bitmap images return a number (native resource ID) in React Native.
declare module '*.png' {
  const content: number;
  export default content;
}

declare module '*.jpg' {
  const content: number;
  export default content;
}

declare module '*.jpeg' {
  const content: number;
  export default content;
}

declare module '*.webp' {
  const content: number;
  export default content;
}

// If you use SVGs with react-native-svg + an SVGR transformer, uncomment:
// import type { SvgProps } from 'react-native-svg';
// declare module '*.svg' {
//   import * as React from 'react';
//   const content: React.FC<SvgProps>;
//   export default content;
// }
