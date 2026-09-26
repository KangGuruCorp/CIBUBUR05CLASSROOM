declare module 'aruco-marker' {
  export function arucoToSVGString(id: number, size?: string): string;
  export default class ArucoMarker {
    constructor(id: number);
    toSVG(size?: string): string;
  }
}

declare module 'js-aruco2' {
  export namespace AR {
    export interface Point {
      x: number;
      y: number;
    }

    export interface Marker {
      id: number;
      corners: Point[];
      hammingDistance?: number;
    }

    export interface DetectorOptions {
      dictionaryName?: string;
      maxHammingDistance?: number;
    }

    export class Detector {
      constructor(options?: DetectorOptions);
      detect(image: ImageData): Marker[];
    }

    export const DICTIONARIES: Record<string, any>;
  }

  export const AR: typeof AR;
}
