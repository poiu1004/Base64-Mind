declare module 'd3-force-3d' {
  export function forceSimulation<N extends object>(nodes?: N[], numDimensions?: number): Simulation<N>;
  export function forceLink<N extends object, L extends object>(links?: L[]): ForceLink<N, L>;
  export function forceManyBody<N extends object>(): ForceManyBody<N>;
  export function forceCenter<N extends object>(x?: number, y?: number, z?: number): ForceCenter<N>;
  export function forceCollide<N extends object>(radius?: number | ((d: N) => number)): ForceCollide<N>;
  export function forceRadial<N extends object>(radius: number | ((d: N) => number), x?: number, y?: number, z?: number): ForceRadial<N>;

  export interface Simulation<N extends object> {
    nodes(): N[];
    nodes(nodes: N[]): this;
    alpha(): number;
    alpha(alpha: number): this;
    alphaMin(): number;
    alphaMin(min: number): this;
    alphaDecay(): number;
    alphaDecay(decay: number): this;
    alphaTarget(): number;
    alphaTarget(target: number): this;
    velocityDecay(): number;
    velocityDecay(decay: number): this;
    force(name: string): Force<N> | undefined;
    force(name: string, force: Force<N> | null): this;
    find(x: number, y?: number, z?: number, radius?: number): N | undefined;
    on(typenames: string, listener: null): this;
    on(typenames: string, listener: () => void): this;
    on(typenames: string): (() => void) | undefined;
    stop(): this;
    tick(iterations?: number): this;
    restart(): this;
  }

  export interface Force<N extends object> {
    (alpha: number): void;
    initialize?(nodes: N[], numDimensions: number): void;
  }

  export interface ForceLink<N extends object, L extends object> extends Force<N> {
    links(): L[];
    links(links: L[]): this;
    id(): (d: N, i: number, data: N[]) => string | number;
    id(id: (d: N, i: number, data: N[]) => string | number): this;
    distance(): number | ((d: L) => number);
    distance(distance: number | ((d: L) => number)): this;
    strength(): number | ((d: L) => number);
    strength(strength: number | ((d: L) => number)): this;
    iterations(): number;
    iterations(iterations: number): this;
  }

  export interface ForceManyBody<N extends object> extends Force<N> {
    strength(): number | ((d: N) => number);
    strength(strength: number | ((d: N) => number)): this;
    theta(): number;
    theta(theta: number): this;
    distanceMin(): number;
    distanceMin(distance: number): this;
    distanceMax(): number;
    distanceMax(distance: number): this;
  }

  export interface ForceCenter<N extends object> extends Force<N> {
    x(): number;
    x(x: number): this;
    y(): number;
    y(y: number): this;
    z(): number;
    z(z: number): this;
  }

  export interface ForceCollide<N extends object> extends Force<N> {
    radius(): number | ((d: N) => number);
    radius(radius: number | ((d: N) => number)): this;
    strength(): number;
    strength(strength: number): this;
    iterations(): number;
    iterations(iterations: number): this;
  }

  export interface ForceRadial<N extends object> extends Force<N> {
    strength(): number | ((d: N) => number);
    strength(strength: number | ((d: N) => number)): this;
    radius(): number | ((d: N) => number);
    radius(radius: number | ((d: N) => number)): this;
    x(): number;
    x(x: number): this;
    y(): number;
    y(y: number): this;
    z(): number;
    z(z: number): this;
  }
}
